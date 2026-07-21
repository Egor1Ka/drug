# Design: SEO for PageContent

**Date:** 2026-07-21
**Status:** Approved — ready for implementation plan

## Problem

Hand-coded pages (unique bespoke design, fixed set of routes) get their editable
content from the `page-content` collection, keyed by `pageKey` (`home` → `/`,
`pricing` → `/pricing`). Editors can change text/photos inside predefined blocks,
but they **cannot manage SEO** for these pages.

Today SEO for hand-coded pages is **not editable in the CMS at all** — it lives in
i18n message files (e.g. `generateMetadata` reads the `Home.meta` translation
namespace in `src/app/(frontend)/[locale]/page.tsx`). The source of truth for SEO
must move into Payload so editors control it per page, per locale.

## Decision

**SEO lives on the `page-content` document itself** (Variant A), because a
`page-content` doc *is* the CMS representation of a hand-coded route. One document
= one page = its content **and** its SEO. No separate collection, no duplicated
`pageKey`, no extra join on render.

The existing `pages` collection is **not** the home for this: hand-coded routes are
not `pages` documents, and `pages` is effectively an unused template remnant (see
Roadmap — it is slated for removal as a separate task).

**`sections` is optional.** A `page-content` document can exist purely to carry SEO
for a fully hand-coded page that has no editable blocks — e.g.
`{ pageKey: 'about', sections: [], meta: { … } }`. This is the deliberate model:
`page-content` is the CMS representation of a hand-coded route, where both the
editable content (`sections`) and the SEO (`meta`) are optional parts of that one
document. This covers the "page is fully custom-built but still needs SEO" case
without introducing the `pages` block builder.

### Rejected alternatives

- **Separate `PageSeo` collection keyed by `pageKey`** — only justified if content
  editors and SEO editors need different access/roles. They don't. It adds a
  duplicated key, a second lookup on render, and a page-without-SEO desync risk.
- **Migrate hand-coded content back into the `pages` block builder** — contradicts
  the whole direction of the project (fully custom design, dev-authored routes).

## Constraints & conventions

- SEO fields (`meta.title`, `meta.description`) are **localized** (multi-language
  site; mirrors how `title` is localized in `pages`).
- Data access stays in the feature's `api/` layer
  (`src/app/(frontend)/_features/page-content/api/`) — pages/components never call
  `getPayload` directly.
- `fetchPageContent(pageKey, locale)` is already wrapped in React `cache()` with
  primitive args, so `generateMetadata` and the page render share **one** DB hit.
- Reuse the existing `plugin-seo` field set — do not hand-roll SEO fields.

## Components

### 1. `src/fields/metaTab.ts` (new — shared factory)

Extract the SEO tab config currently inlined in `src/collections/Pages/index.ts`
(lines ~86–119) into a reusable module, alongside the existing `link.ts` /
`linkGroup.ts`.

Exports:
- `metaFields` — the array of `plugin-seo` fields: `OverviewField`,
  `MetaTitleField` (localized), `MetaImageField` (`relationTo: 'media'`),
  `MetaDescriptionField` (localized), `PreviewField`.
- `metaTab` — a ready `Tab` object (`name: 'meta'`, `label: 'SEO'`, `fields:
  metaFields`) for collections that use a `tabs` field.

Both `pages` and `page-content` consume `metaTab`, so the SEO config exists in
exactly one place while `pages` still exists.

### 2. `src/collections/PageContent/index.ts` (modified)

Wrap the current flat fields in a `tabs` field:
- **Content** tab — `pageKey`, `sections` (unchanged field configs).
- **SEO** tab — `metaTab`.

Result: the doc gains a localized `meta` group (`title`, `description`, `image`).
`access.read` stays `anyone` (SEO metadata is public anyway).

### 3. `src/collections/Pages/index.ts` (modified)

Replace the inline SEO tab with `metaTab` from the shared factory (behavior
unchanged; pure de-duplication). This keeps one SEO definition until `pages` is
removed.

### 4. `src/payload-types.ts` (regenerated)

Regenerate types so `PageContent` includes the `meta` group.

### 5. `src/plugins/index.ts` (modified)

Teach the `seoPlugin` `generateTitle` / `generateURL` functions to handle
`page-content` docs. The `generate` buttons in the admin (Overview/Preview) call
these with `{ doc, collectionSlug }`.

- Add a branch for `collectionSlug === 'page-content'` that maps `pageKey → path`
  (`home` → `/`, otherwise `/<pageKey>`).
- Reuse the `pageKey → path` mapping that the `revalidatePageContent` hook already
  applies, so the routing rule lives in one place (extract a small shared helper if
  needed).

### 6. Frontend metadata wiring — source of truth moves to CMS

Add a mapper in `page-content/api` (e.g. `buildPageMetadata(content, fallback)`)
that:
- reads `content.meta.title` / `content.meta.description` / `content.meta.image`,
- falls back to the current i18n values when a field is empty (so nothing
  regresses on pages whose CMS meta is not yet filled).

Wire it into each hand-coded page's `generateMetadata`. Since `fetchPageContent` is
`cache()`-memoized, this adds no extra DB round-trip.

Note: the existing `src/utilities/generateMeta.ts` is template-bound (hardcoded
"| Payload Website Template" suffix, slug-based URL, typed for `Page | Post`).
Prefer a feature-local mapper in `page-content/api` over bending that utility.

### 7. Seed (`scripts/seed-layout.ts` / page-content seed)

Populate a default `meta` for existing `pageKey`s (at least `home`) so SEO is not
empty on a fresh seed.

## Data flow

```
Editor fills SEO tab on page-content doc (per locale)
        │
        ▼
page-content document: { pageKey, sections, meta: { title, description, image } }
        │
        ▼  fetchPageContent(pageKey, locale)  [React cache() — one DB hit]
        ├──────────────► page render (sections)
        └──────────────► generateMetadata → buildPageMetadata(content, i18nFallback) → Next.js Metadata
```

## Testing

- Unit: `buildPageMetadata` returns CMS meta when present; falls back to i18n
  values when CMS fields are empty; maps image → OG image URL correctly.
- Unit: `pageKey → path` helper (`home` → `/`, `pricing` → `/pricing`).
- Integration: a `page-content` doc with `meta` set renders correct `<title>` /
  meta description / OG tags for the matching locale.
- Regression: a `page-content` doc with empty `meta` still yields the previous
  (i18n-based) metadata.

## Out of scope (Roadmap — separate tasks)

1. **Remove the `pages` collection** and all its tails: the `[locale]/[slug]`
   catch-all route, `pages-sitemap.xml`, `redirectsPlugin({ collections: ['pages',
   ...] })` config, `seoPlugin` `Post | Page` types, generic `RenderBlocks` / `heros`
   renderers, and the `home-static` seed.
2. **Drafts + live preview for `page-content`** — add `versions.drafts` (with
   autosave) and live preview, matching what `pages` has today.
