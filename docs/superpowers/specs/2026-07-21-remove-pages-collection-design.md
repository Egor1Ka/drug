# Design: Remove the `pages` collection

**Date:** 2026-07-21
**Status:** Approved — ready for implementation plan

## Problem

The project is a fully hand-coded site: unique bespoke design, dev-authored routes,
editors only tweak content of predefined blocks via the `page-content` collection.
The template's `pages` collection — a generic block-builder for non-devs to assemble
NEW pages from a block library on a catch-all `[slug]` route — has no role in this
model and is effectively dead weight. It also carries template branding and demo
plumbing. Remove it and everything exclusive to it, while preserving the site
capabilities that are NOT Pages-specific.

## What is Pages-exclusive vs shared (verified)

**Pages-exclusive (remove):**
- `src/collections/Pages/` (config + `hooks/revalidatePage.ts`).
- The catch-all render route body `src/app/(frontend)/[locale]/[slug]/page.tsx` (Pages
  rendering) + its `page.client.tsx`.
- `src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts`.
- `src/endpoints/seed/home-static.ts` (the `[slug]` home fallback).
- `src/blocks/RenderBlocks.tsx` (layout-blocks renderer — used ONLY by the `[slug]` route).
- `src/heros/` (`RenderHero.tsx`, `config.ts`, `HighImpact/`, `MediumImpact/`, `LowImpact/`)
  — verified used ONLY by the `[slug]` route and the Pages config; blog posts use their
  own `heroImage` (a Media field), not `heros/`.
- Pages-only layout blocks: `src/blocks/Content/`, `src/blocks/ArchiveBlock/`,
  `src/blocks/Form/` (config + Component) — each verified consumed only by
  `RenderBlocks` + the Pages config.

**Shared — KEEP (only strip the `Page`/`pages` references):**
- `src/components/PayloadRedirects/` — the blog `[slug]` route uses it too, and it powers
  global CMS redirects (see Decision 1).
- `src/blocks/CallToAction/`, `src/blocks/MediaBlock/` — also registered by `posts`.
- `src/components/Link/`, `src/components/AdminBar/`, `src/fields/link.ts`,
  `src/fields/defaultLexical.ts`, `src/utilities/generateMeta.ts` — shared infra typed
  against `Page`.
- The `redirects` collection (from `redirectsPlugin`) — kept for `posts` + custom URLs.

## Decisions

### Decision 1 — Global CMS redirects are preserved via a redirect-only catch-all

The user wants managed redirects to keep working for ANY URL (not just blog), which the
Pages `[slug]` route currently provided via `<PayloadRedirects>`. Rather than delete the
route, **strip it to a redirect-only catch-all**: remove all Pages rendering
(`generateStaticParams`, `homeStatic`, hero/layout, `RenderHero`, `RenderBlocks`,
`generateMeta`, live-preview) and keep only the `PayloadRedirects` lookup, which redirects
if a `redirects` doc matches the path, else 404s.

- Hand-coded routes (e.g. `[locale]/page.tsx`, future `[locale]/pricing/page.tsx`) take
  precedence over the dynamic `[slug]`, so the catch-all only ever handles unmatched
  paths — exactly "redirect or 404".
- This reuses the existing, proven `PayloadRedirects` mechanism — no new middleware, no
  edge/Local-API complications.

Rejected: redirect handling in `src/middleware.ts` — middleware can't cleanly use the
Payload Local API (Node runtime + DB), so it would need a cached API route; more moving
parts for no benefit over the redirect-only route.

### Decision 2 — Full cleanup of dead blocks/heros

After `RenderBlocks` is removed, the Pages-only blocks and `heros/*` become dead code.
Delete them (configs + React Components), not just unregister — cleaner repo. Shared
blocks (`CallToAction`, `MediaBlock`) and their Components are KEPT because `posts`
references them; the plan verifies each block/component's consumer set before deleting.

## Components of the change

1. **Delete** the Pages-exclusive files/dirs listed above.
2. **Rewrite** `[locale]/[slug]/page.tsx` as a redirect-only catch-all:
   ```tsx
   import { PayloadRedirects } from '@/components/PayloadRedirects'
   import { setRequestLocale } from 'next-intl/server'
   import type { AppLocale } from '@/i18n/routing'

   type Args = { params: Promise<{ locale: AppLocale; slug?: string }> }

   export default async function CatchAllRedirect({ params }: Args) {
     const { locale, slug } = await params
     setRequestLocale(locale)
     const url = '/' + (slug ? decodeURIComponent(slug) : '')
     return <PayloadRedirects url={url} />
   }
   ```
   (No `generateStaticParams`, no metadata — a dynamic redirect/404 fallback.)
3. **Unregister Pages** in `src/payload.config.ts` (remove import + `collections` entry).
4. **`src/plugins/index.ts`:** `redirectsPlugin` collections `['pages','posts'] → ['posts']`;
   `seoPlugin` `generateTitle`/`generateURL` generics `Post | Page | PageContent →
   Post | PageContent` (drop `Page`, drop its import).
5. **`src/components/PayloadRedirects/index.tsx`:** drop the `Page` type; simplify the
   `relationTo !== 'pages'` URL-building branches (with `pages` gone, references resolve to
   `posts`/other collections, so the prefix is always `/${relationTo}`).
6. **`src/utilities/generateMeta.ts`:** type `Partial<Post>` only (drop `Page`).
7. **`src/fields/link.ts`, `src/components/Link/index.tsx`, `src/components/AdminBar/index.tsx`,
   `src/fields/defaultLexical.ts`:** drop `'pages'` from `relationTo` options / drop the
   `Page` type from unions. (Note: `link.ts` was recently changed for header/footer's
   `customOnly` — preserve that; only remove the `pages` internal-link target.)
8. **Regenerate** `src/payload-types.ts` (the `Page`/`pages` types disappear).

## Data flow after removal

```
Request /en/<path>
   ├─ matches a hand-coded route (page.tsx, pricing/page.tsx, blog/*) → that route renders
   └─ no match → [locale]/[slug] catch-all → PayloadRedirects(url)
                     ├─ redirects doc matches → redirect(to)
                     └─ no match → notFound() (404)
```

## Testing

- Build: `pnpm build` succeeds; no route/type references a removed module; sitemap build
  (`postbuild` next-sitemap) still works without `pages-sitemap`.
- `pnpm exec tsc --noEmit` → 0 errors (the `Page` type is fully gone from all unions).
- `pnpm test:int` → the existing suite still passes (no test targets Pages; header/footer,
  blog, SEO, and page-content tests remain green).
- Redirect smoke: a `redirects` doc `from:/old → to:/en` issues a 307/308 to the target;
  an unknown path 404s. (Manual/ops check against a running instance with a seeded redirect.)
- Blog unaffected: `[locale]/blog/*` routes and their `PayloadRedirects` usage still work.

## Out of scope (separate work)

- **Drafts + live preview for `page-content`** — the next roadmap item; `LivePreviewListener`
  and draft-mode infra are intentionally KEPT (not deleted here) for reuse there.
- **De-templating `posts`/blog SEO** — `generateMeta.ts` still carries the
  `| Payload Website Template` title suffix and a placeholder OG image for posts; that is a
  separate branding pass, not part of removing Pages.
- Renaming `page-content` → `pages` (cosmetic collection-slug migration) — not now.
