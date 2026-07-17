# Blog Frontend Modeled on drug-card.io — Design

**Date:** 2026-07-16
**Status:** Approved
**Scope:** Blog only (case studies explicitly deferred to a later project)

## Goal

Restyle and extend the existing Payload website template so the blog looks and behaves
like https://drug-card.io/blog/ — listing page, article page, taxonomy — and import
three real articles from that site as seed content.

## Decisions (confirmed with user)

1. **Scope:** blog only; no case studies section in this iteration.
2. **Taxonomy:** categories (filter tabs on the listing) **and** a new `Tags` collection
   (chips on the article page, each linking to a tag listing).
3. **URLs:** rename `/posts` routes to `/blog` (`/blog`, `/blog/[slug]`, `/blog/page/[n]`).
4. **Design fidelity:** clone only the blog listing and article page layouts. The site
   header and footer stay as the template provides them. White background, dark text,
   blue links.
5. **Content:** import the three most recent articles as-is (English):
   - "PBRER vs PSUR: Key Differences in Pharmacovigilance"
   - "Pharmacovigilance Automation: Transforming Drug Safety Processes"
   - "What Is Drug Safety and Pharmacovigilance? Explained"

## Approach

Adapt the template's existing posts pages in place (approach A). This keeps live
preview, drafts, SEO plugin wiring, sitemap, and revalidation hooks working with
minimal new code. Alternatives rejected: building parallel `/blog` routes from
scratch (duplicated logic), and copying the original site's static HTML (bypasses
the CMS).

## 1. Payload changes (backend)

- **New collection `tags`** — mirror of `categories`: `title` (text, required) +
  `slugField()`. Public read access, authenticated write.
- **`posts` collection:** add `tags` relationship field (`hasMany: true`,
  `relationTo: 'tags'`, sidebar, next to `categories`). Add `tags` to
  `defaultPopulate`.
- **Lexical editor for posts:** add the existing `CallToAction` block to
  `BlocksFeature` so editors can insert a mid-article CTA (mirrors the original's
  "Looking for Expert Guidance?" block).
- **Read time:** computed at render from the Lexical content (~200 wpm) by a
  utility function. Not stored.

## 2. Routes (frontend)

| Old | New |
|---|---|
| `/posts` | `/blog` |
| `/posts/page/[pageNumber]` | `/blog/page/[pageNumber]` |
| `/posts/[slug]` | `/blog/[slug]` |
| — | `/blog/tag/[slug]` (new: posts filtered by tag) |

- Category filter on the listing via `?category=<slug>` search param, resolved
  server-side (no client state).
- The tag page `/blog/tag/[slug]` reuses the listing layout (same cards and
  pagination) with a "Posts tagged X" heading instead of the category tabs.
- Update everything that references the old paths: `generatePreviewPath`,
  `revalidatePost` hooks, posts sitemap route, seed data links if any, CMS link
  builders.

## 3. Listing page `/blog`

- Card grid matching the original (verified against the live site's markup):
  3 columns on desktop, 2 on tablet, 1 on mobile. Card structure top to
  bottom: featured image, then a row with publication date (DD/MM/YYYY) and
  author name, post title, "Learn more" button.
- Category filter tabs above the list: "All" + all categories from CMS; active
  tab reflects the `category` search param.
- Numbered pagination below (1 2 3 … Next) — reuse the template's Pagination
  component, restyled.

## 4. Article page `/blog/[slug]`

- Breadcrumbs: Home > Blog > first category > post title.
- H1 title; beneath it publication date + "N min read"; beneath that tag chips
  linking to `/blog/tag/[slug]`.
- Content typography styled to match the original: h2/h3 sections, tables,
  bulleted and numbered lists, bold emphasis; white background, dark text, blue
  links.
- Mid-content CTA rendered via the CallToAction block when present.
- "Similar Posts" section at the bottom: uses the `relatedPosts` field; when
  empty, falls back to the latest posts sharing the first category (excluding
  the current post). Cards show thumbnail, date, author, title.

## 5. Content import

- Script `scripts/import-blog.ts`, run once via
  `payload run` (single command).
- For each of the three article URLs: fetch HTML, extract the article body,
  convert HTML → Lexical using the `@payloadcms/richtext-lexical` HTML
  converter, download the hero and inline images into the `media` collection,
  create/find the categories and tags used by the article, create the post
  with the original publication date and SEO title/description, publish it.
- Idempotent: re-running finds posts by slug and skips or updates instead of
  duplicating.

## 6. Error handling

- Listing with an unknown `?category` slug: show empty state ("No posts yet"),
  not a 404.
- Tag page with unknown slug: 404 via `notFound()`.
- Import script: fail loudly per-article with a clear message; one article
  failing must not abort the others.

## 7. Testing & verification

- Existing int/e2e suites must pass after route renames.
- Manual verification: run dev server, check `/blog` (tabs, cards, pagination),
  one imported article (breadcrumbs, read time, tags, table rendering,
  Similar Posts), and a tag page.
