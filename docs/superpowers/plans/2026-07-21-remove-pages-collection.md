# Remove `pages` Collection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the template `pages` collection and everything exclusive to it, while preserving global CMS redirects (via a redirect-only catch-all) and everything shared with `posts`/blog.

**Architecture:** Three ordered tasks, each ending compilable+buildable. (1) Reduce the `[slug]` catch-all to a redirect-only route and drop the Pages render entry points. (2) Remove the `pages` collection and fix every `Page`/`pages` reference, then regenerate types. (3) Delete the now-orphaned render/block/hero files.

**Tech Stack:** Payload CMS 3.x (MongoDB — **no migration needed** to drop a collection), Next.js App Router, `@payloadcms/plugin-redirects`, `@payloadcms/plugin-seo`, Vitest.

## Global Constraints

- **Package manager:** `pnpm`.
- **Gates per task:** `pnpm exec tsc --noEmit` MUST be 0 errors project-wide; `pnpm build` MUST succeed (proves Payload init + Next build have no broken imports / no `relationTo` pointing at a removed collection); `pnpm test:int` MUST stay green (currently 47/47). Repo-wide `pnpm lint` has 9 PRE-EXISTING failures in untouched files — use `pnpm exec eslint <changed files>` for the lint gate, not `pnpm lint`.
- **No new unit tests:** this is a removal; correctness is proven by tsc + build + the existing suite + grep-for-orphans. Do NOT invent tests for deleted code.
- **NO-COMMITS mode:** this branch layers uncommitted work; leave all changes in the working tree, staged or unstaged. Do NOT run `git commit`. Ignore the plan-template's commit habit — there are no commit steps here.
- **Do not touch** the unrelated uncommitted header/footer + SEO changes already in the working tree; only touch the files each task names.
- **Code style:** `const` only, no `let`/`for`/`while`, named functions over inline lambdas with logic; when editing pre-existing template files, make the MINIMAL edit the task specifies — do not restyle surrounding code.

---

### Task 1: Redirect-only catch-all + drop Pages render entry points

Reduce the `[slug]` route to a pure redirect/404 fallback (preserving global CMS redirects) and delete the Pages-render-only entry points. The `pages` collection itself stays registered in this task, so the app still compiles and builds.

**Files:**
- Rewrite: `src/app/(frontend)/[locale]/[slug]/page.tsx`
- Delete: `src/app/(frontend)/[locale]/[slug]/page.client.tsx`
- Delete: `src/endpoints/seed/home-static.ts`
- Delete: `src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts` (and its now-empty folder)
- Modify: `next-sitemap.config.cjs`

**Interfaces:**
- Consumes: `PayloadRedirects` from `@/components/PayloadRedirects` (unchanged in this task), `AppLocale` from `@/i18n/routing`.

- [ ] **Step 1: Rewrite the catch-all as redirect-only**

Replace the ENTIRE contents of `src/app/(frontend)/[locale]/[slug]/page.tsx` with:

```tsx
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { setRequestLocale } from 'next-intl/server'

import type { AppLocale } from '@/i18n/routing'

type Args = {
  params: Promise<{ locale: AppLocale; slug?: string }>
}

// Catch-all fallback: any path not served by a hand-coded route resolves a CMS
// redirect if one exists, otherwise 404s. Hand-coded routes take precedence over
// this dynamic segment, so it only ever handles unmatched paths.
export default async function CatchAllRedirect({ params }: Args) {
  const { locale, slug } = await params

  setRequestLocale(locale)

  const url = '/' + (slug ? decodeURIComponent(slug) : '')

  return <PayloadRedirects url={url} />
}
```

This removes all Pages rendering (`generateStaticParams`, `homeStatic`, `queryPageBySlug`, `RenderHero`, `RenderBlocks`, `generateMeta`, `PageClient`, `LivePreviewListener`, `draftMode`).

- [ ] **Step 2: Delete the Pages-render-only entry points**

```bash
rm "src/app/(frontend)/[locale]/[slug]/page.client.tsx"
rm src/endpoints/seed/home-static.ts
rm -r "src/app/(frontend)/(sitemaps)/pages-sitemap.xml"
```

- [ ] **Step 3: Drop `pages-sitemap` from the next-sitemap config**

In `next-sitemap.config.cjs`:
- In the `exclude` array, remove the `'/pages-sitemap.xml'` entry (keep `'/posts-sitemap.xml'`, `'/*'`, `'/blog/*'`).
- In `robotsTxtOptions.additionalSitemaps`, remove the `` `${SITE_URL}/pages-sitemap.xml` `` entry (keep the posts one).

- [ ] **Step 4: Verify nothing still imports the deleted modules**

Run: `grep -rn "home-static\|homeStatic\|pages-sitemap\|page.client" src --include=*.ts --include=*.tsx | grep -v node_modules`
Expected: only matches inside `src/collections/Pages/hooks/revalidatePage.ts` (the `pages-sitemap` revalidation tag — that file is deleted in Task 2). No matches in any route/component. (`page.client` should have zero matches.)

- [ ] **Step 5: Gates**

Run: `pnpm exec tsc --noEmit` → 0 errors. Then `pnpm exec eslint "src/app/(frontend)/[locale]/[slug]/page.tsx"` → clean. Then `pnpm build` → succeeds (the `pages` collection is still registered, so admin/types are intact; the catch-all now serves redirects/404).
Note: `pnpm build`'s `postbuild` regenerates `public/robots.txt` and `public/sitemap.xml` without the pages-sitemap entry — that regeneration is expected.

- [ ] **Step 6: Commit** — SKIP (NO-COMMITS mode). Leave changes in the working tree.

---

### Task 2: Remove the `pages` collection and all `Page`/`pages` references

Delete the collection, fix every file that imports the `Page` type or names the `'pages'` collection slug, and regenerate types. This is one coordinated task because removing the collection makes the `Page` type vanish and breaks all its consumers simultaneously — they must all be fixed together to reach a green compile.

**Files:**
- Delete: `src/collections/Pages/` (whole dir: `index.ts`, `hooks/revalidatePage.ts`)
- Modify: `src/payload.config.ts`
- Modify: `src/plugins/index.ts`
- Modify: `src/components/PayloadRedirects/index.tsx`
- Modify: `src/utilities/generateMeta.ts`
- Modify: `src/components/Link/index.tsx`
- Modify: `src/fields/link.ts`
- Modify: `src/fields/defaultLexical.ts`
- Regenerate: `src/payload-types.ts`

**Interfaces:**
- After this task the `Page` type and `'pages'` collection slug no longer exist anywhere; `seoPlugin`/`redirectsPlugin`/`PayloadRedirects`/`generateMeta`/`CMSLink` operate over `Post` (+ `PageContent` for SEO) only.

- [ ] **Step 1: Delete the collection**

```bash
rm -r src/collections/Pages
```

- [ ] **Step 2: Unregister Pages in `src/payload.config.ts`**

- Remove the import line `import { Pages } from './collections/Pages'`.
- In the `collections` array, change `collections: [Pages, PageContent, Posts, Media, Categories, Tags, Users]` to `collections: [PageContent, Posts, Media, Categories, Tags, Users]`.

- [ ] **Step 3: `src/plugins/index.ts`**

- Change the type import `import { Page, PageContent, Post } from '@/payload-types'` to `import { PageContent, Post } from '@/payload-types'`.
- Change both generic annotations `GenerateTitle<Post | Page | PageContent>` and `GenerateURL<Post | Page | PageContent>` to `GenerateTitle<Post | PageContent>` and `GenerateURL<Post | PageContent>`.
- In `redirectsPlugin({ collections: ['pages', 'posts'], ... })` change the array to `collections: ['posts']`.

- [ ] **Step 4: `src/components/PayloadRedirects/index.tsx`**

- Change `import type { Page, Post } from '@/payload-types'` to `import type { Post } from '@/payload-types'`.
- Change the cast `(await getCachedDocument(collection, id)()) as Page | Post` to `as Post`.
- The `redirects.to.reference.relationTo` type is now `'posts'` only, so the `!== 'pages'` comparisons become invalid (`'posts'` and `'pages'` do not overlap — a tsc error). Replace the two `redirectUrl` assignments (the `if` and `else` branches) so the prefix is unconditional:

```tsx
    if (typeof redirectItem.to?.reference?.value === 'string') {
      const collection = redirectItem.to?.reference?.relationTo
      const id = redirectItem.to?.reference?.value

      const document = (await getCachedDocument(collection, id)()) as Post
      redirectUrl = `/${redirectItem.to?.reference?.relationTo}/${document?.slug}`
    } else {
      redirectUrl = `/${redirectItem.to?.reference?.relationTo}/${
        typeof redirectItem.to?.reference?.value === 'object'
          ? redirectItem.to?.reference?.value?.slug
          : ''
      }`
    }
```

(Preserve the existing optional-chaining style of this pre-existing template file — this is a minimal edit, not a rewrite.)

- [ ] **Step 5: `src/utilities/generateMeta.ts`**

- Change `import type { Media, Page, Post, Config } from '../payload-types'` to `import type { Media, Post, Config } from '../payload-types'`.
- Change the `doc` param type `doc: Partial<Page> | Partial<Post> | null` to `doc: Partial<Post> | null`.

- [ ] **Step 6: `src/components/Link/index.tsx`**

- Change `import type { Page, Post } from '@/payload-types'` to `import type { Post } from '@/payload-types'`.
- In the `reference` shape, change `relationTo: 'pages' | 'posts'` to `relationTo: 'posts'` and `value: Page | Post | string | number` to `value: Post | string | number`.
- The `referenceBasePath` ternary uses `reference?.relationTo !== 'pages'`, now invalid. Replace the whole `referenceBasePath` declaration with:

```tsx
  const referenceBasePath = reference?.relationTo === 'posts' ? '/blog' : ''
```

- [ ] **Step 7: `src/fields/link.ts`**

- Change `relationTo: ['pages', 'posts']` to `relationTo: ['posts']`. (This is the internal-link target list; header/footer's `customOnly`/`optionalURL` behaviour is unrelated — leave it untouched.)

- [ ] **Step 8: `src/fields/defaultLexical.ts`**

- Change `enabledCollections: ['pages', 'posts']` to `enabledCollections: ['posts']`.

- [ ] **Step 9: Regenerate types**

Run: `pnpm generate:types`
Expected: success; the `Page` interface and the `'pages'` collection entries disappear from `src/payload-types.ts`.

- [ ] **Step 10: Verify no `Page`/`pages` references remain**

Run: `grep -rn "payload-types'.*\bPage\b\|collection: 'pages'\|relationTo: 'pages'\|'pages'" src --include=*.ts --include=*.tsx | grep -v node_modules | grep -v PageContent`
Expected: no matches. (`AdminBar/index.tsx` contains a `pages` label KEY in a plain `collectionLabels` object — that is an inert UI label with NO dependency on the `Page` type or the collection; it does not match the internal-link/collection patterns above and is intentionally left as-is. If tsc/build is green, do not touch it.)

If tsc surfaces any `Page`-type reference this plan did not list, fix it the same way (drop `Page` from the union / replace the `!== 'pages'` comparison), then re-run.

- [ ] **Step 11: Gates**

Run: `pnpm exec tsc --noEmit` → 0 errors. Then `pnpm exec eslint src/payload.config.ts src/plugins/index.ts src/components/PayloadRedirects/index.tsx src/utilities/generateMeta.ts src/components/Link/index.tsx src/fields/link.ts src/fields/defaultLexical.ts` → clean. Then `pnpm build` → succeeds (proves Payload initialises with `pages` gone and no `relationTo`/`enabledCollections` points at it). Then `pnpm test:int` → still green (47/47).

- [ ] **Step 12: Commit** — SKIP (NO-COMMITS mode).

---

### Task 3: Delete the orphaned render/block/hero files

With the `[slug]` route stripped (Task 1) and the `pages` collection gone (Task 2), the layout-blocks renderer, the `heros/*` render layer, and the Pages-only block configs/components have no importers left. Delete them.

**Files (delete):**
- `src/blocks/RenderBlocks.tsx`
- `src/heros/` (whole dir: `RenderHero.tsx`, `config.ts`, `HighImpact/`, `MediumImpact/`, `LowImpact/`)
- `src/blocks/Content/` (config + Component)
- `src/blocks/ArchiveBlock/` (config + Component)
- `src/blocks/Form/` (config + Component)

**Keep (shared with `posts`):** `src/blocks/CallToAction/`, `src/blocks/MediaBlock/`, `src/blocks/Banner/`, `src/blocks/Code/`.

- [ ] **Step 1: Confirm each target is orphaned before deleting**

Run each and expect NO matches outside the target itself:
```bash
grep -rn "blocks/RenderBlocks\|RenderBlocks" src --include=*.ts --include=*.tsx | grep -v node_modules
grep -rn "@/heros\|heros/RenderHero\|heros/config" src --include=*.ts --include=*.tsx | grep -v node_modules
grep -rn "blocks/Content\b\|ArchiveBlock\|blocks/Form\b\|FormBlock" src --include=*.ts --include=*.tsx | grep -v node_modules
```
Expected: no matches (all former importers — the `[slug]` route and `collections/Pages` — are already gone). If a match appears, STOP and report; do not delete a still-imported file.

- [ ] **Step 2: Delete the orphaned files**

```bash
rm src/blocks/RenderBlocks.tsx
rm -r src/heros
rm -r src/blocks/Content src/blocks/ArchiveBlock src/blocks/Form
```

- [ ] **Step 3: Gates**

Run: `pnpm exec tsc --noEmit` → 0 errors. Then `pnpm build` → succeeds. Then `pnpm test:int` → 47/47.

- [ ] **Step 4: Final orphan sweep**

Run: `grep -rn "RenderHero\|RenderBlocks\|HighImpact\|MediumImpact\|LowImpact\|home-static\|homeStatic\|collections/Pages\|from '@/heros" src --include=*.ts --include=*.tsx | grep -v node_modules`
Expected: no matches anywhere.

- [ ] **Step 5: Commit** — SKIP (NO-COMMITS mode).

---

## Self-Review

**Spec coverage:**
- Redirect-only catch-all preserving global CMS redirects → Task 1 Step 1 (+ Decision 1 of spec).
- Delete Pages-exclusive route/client/sitemap/home-static → Task 1.
- Remove `pages` collection + unregister → Task 2 Steps 1-2.
- Strip `Page`/`pages` from plugins, PayloadRedirects, generateMeta, Link, link.ts, defaultLexical → Task 2 Steps 3-8.
- Regenerate types → Task 2 Step 9.
- Full cleanup of dead blocks/heros → Task 3.
- KEEP shared `CallToAction`/`MediaBlock`, `PayloadRedirects`, `LivePreviewListener` + draft infra (for future preview) → not deleted anywhere; Task 3 "Keep" list is explicit.
- MongoDB → no migration → stated in Tech Stack.

**Deviation from spec noted:** the spec listed `AdminBar` under "strip Page/pages references"; on inspection `AdminBar/index.tsx` imports no `Page` type and its `collectionLabels.pages` is an inert UI label with no collection dependency — editing it forces cascading fallback edits for zero functional gain, so it is intentionally left untouched (Task 2 Step 10 documents this). Compile+build prove it is safe.

**Placeholder scan:** none — every edit gives exact before/after strings or exact file contents.

**Type consistency:** `Page` is removed from every union it appeared in (plugins, PayloadRedirects, generateMeta, Link) in the same task that regenerates types (Task 2), so no task ends referencing a type a sibling task deleted. Task ordering keeps tsc/build green at every boundary: Task 1 leaves `pages` registered; Task 2 removes it and fixes all consumers atomically; Task 3 only deletes files already orphaned by Tasks 1-2.

**Out of scope (separate plans):** drafts + live preview for `page-content` (reuses the kept `LivePreviewListener`/draft infra); de-templating `posts` SEO branding in `generateMeta.ts`; renaming `page-content` → `pages`.
