# PageContent SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give editors CMS-managed, localized SEO for hand-coded pages by adding an SEO tab to the `page-content` collection and making that the source of truth for page metadata.

**Architecture:** Extract the `plugin-seo` field set from the `pages` collection into a shared `metaTab` factory, reuse it on `page-content` (wrapped in tabs). Teach the `seoPlugin` generate functions the `pageKey → path` convention. On the frontend, a feature-local `buildPageMetadata` mapper reads `content.meta` and falls back to the existing i18n values, wired into each hand-coded page's `generateMetadata`.

**Tech Stack:** Payload CMS 3.x, `@payloadcms/plugin-seo`, Next.js App Router, next-intl, Vitest.

## Global Constraints

- **Package manager:** `pnpm` (never `npm`/`yarn`).
- **Tests:** `pnpm test:int` runs Vitest (`vitest run --config ./vitest.config.mts`); specs live in `tests/int/**/*.int.spec.ts(x)`.
- **Type generation:** after any collection/field change run `pnpm generate:types`.
- **Localization:** `meta.title` and `meta.description` MUST be `localized: true` (multi-language site).
- **Code style (user rules):** `const` only, no `let`; no `for`/`while` — use `map`/`filter`/`reduce`; no inline lambdas with logic — extract named functions; guard clauses with explicit object-then-field checks, **no optional chaining `?.` in guards**; pure functions, side effects isolated.
- **`sections` stays optional:** a `page-content` doc may exist purely for SEO (`sections: []`).
- **No auto-commit of unrelated work.** Each task ends with its own commit (the user runs commits; include the commit step so the worker stages the right files, but do not amend or touch unrelated changes).

---

### Task 1: Shared `metaTab` field factory

Extract the inline SEO tab from `pages` into a reusable factory so `pages` and `page-content` share one SEO definition.

**Files:**
- Create: `src/fields/metaTab.ts`
- Create: `tests/int/metaTab.int.spec.ts`
- Modify: `src/collections/Pages/index.ts:16-22` (imports) and `:86-119` (SEO tab)

**Interfaces:**
- Produces:
  - `metaFields: Field[]` — the ordered `plugin-seo` fields (Overview, Title, Image, Description, Preview).
  - `metaTab: Tab` — `{ name: 'meta', label: 'SEO', fields: metaFields }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/int/metaTab.int.spec.ts
import { describe, expect, it } from 'vitest'

import { metaTab } from '@/fields/metaTab'

const fieldNamed = (name: string) =>
  metaTab.fields.find((field) => 'name' in field && field.name === name)

describe('metaTab', () => {
  it('is the SEO tab named meta', () => {
    expect(metaTab.name).toBe('meta')
    expect(metaTab.label).toBe('SEO')
  })

  it('localizes title and description', () => {
    expect(fieldNamed('title')?.localized).toBe(true)
    expect(fieldNamed('description')?.localized).toBe(true)
  })

  it('points the image field at the media collection', () => {
    const imageField = fieldNamed('image')
    expect(imageField && 'relationTo' in imageField ? imageField.relationTo : null).toBe('media')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:int metaTab`
Expected: FAIL — cannot resolve `@/fields/metaTab`.

- [ ] **Step 3: Create the factory**

```ts
// src/fields/metaTab.ts
import type { Field, Tab } from 'payload'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

// The SEO field set shared by every collection that surfaces metadata.
// Kept in one place so `pages`, `page-content` (and future collections) never
// drift apart. Extracted verbatim from the original inline `pages` SEO tab.
export const metaFields: Field[] = [
  OverviewField({
    titlePath: 'meta.title',
    descriptionPath: 'meta.description',
    imagePath: 'meta.image',
  }),
  MetaTitleField({
    hasGenerateFn: true,
    overrides: {
      localized: true,
    },
  }),
  MetaImageField({
    relationTo: 'media',
  }),
  MetaDescriptionField({
    overrides: {
      localized: true,
    },
  }),
  PreviewField({
    hasGenerateFn: true,
    titlePath: 'meta.title',
    descriptionPath: 'meta.description',
  }),
]

// A ready-to-drop `Tab` for collections that use a `tabs` field.
export const metaTab: Tab = {
  name: 'meta',
  label: 'SEO',
  fields: metaFields,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:int metaTab`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor `pages` to use the factory**

In `src/collections/Pages/index.ts`, delete the `@payloadcms/plugin-seo/fields` import block (lines ~16-22) and add `import { metaTab } from '@/fields/metaTab'` with the other imports. Replace the inline SEO tab object (the `{ name: 'meta', label: 'SEO', fields: [ … ] }` entry, lines ~86-119) with `metaTab`:

```ts
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [CallToAction, Content, MediaBlock, Archive, FormBlock],
              localized: true,
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        metaTab,
      ],
```

- [ ] **Step 6: Verify types and lint are unchanged**

Run: `pnpm generate:types && pnpm lint`
Expected: no errors; `git diff src/payload-types.ts` shows no change (pure refactor — the `pages.meta` shape is identical).

- [ ] **Step 7: Commit**

```bash
git add src/fields/metaTab.ts tests/int/metaTab.int.spec.ts src/collections/Pages/index.ts
git commit -m "refactor: extract shared metaTab SEO field factory"
```

---

### Task 2: Add the SEO tab to `page-content`

Wrap the collection's flat fields in a `tabs` field and add the shared SEO tab. This gives `page-content` a localized `meta` group.

**Files:**
- Modify: `src/collections/PageContent/index.ts:23-43` (fields)
- Modify: `src/payload-types.ts` (regenerated)

**Interfaces:**
- Consumes: `metaTab` from `src/fields/metaTab.ts` (Task 1).
- Produces: `PageContent['meta']` type — `{ title?: string | null; description?: string | null; image?: (number | Media) | null } | null` (localized per active locale).

- [ ] **Step 1: Restructure fields into tabs**

In `src/collections/PageContent/index.ts`, add `import { metaTab } from '@/fields/metaTab'` near the top imports. Replace the current `fields: [ pageKey, sections ]` array with a single `tabs` field — a `Content` tab holding the existing two fields (configs unchanged), plus `metaTab`:

```ts
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'pageKey',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: {
                description:
                  "Route identifier: 'home' → /, otherwise /<pageKey> (e.g. 'pricing' → /pricing)",
              },
            },
            {
              name: 'sections',
              type: 'blocks',
              blocks: [FaqSection, TestimonialsSection, LogosSection, StatsSection, TeamSection],
              validate: validateUniqueSectionKeys,
              admin: {
                initCollapsed: true,
              },
            },
          ],
        },
        metaTab,
      ],
    },
  ],
```

Leave `slug`, `access`, `admin`, and `hooks` untouched. Do **not** make `sections` required.

- [ ] **Step 2: Regenerate types**

Run: `pnpm generate:types`
Expected: success.

- [ ] **Step 3: Verify the `meta` type landed on PageContent**

Run: `grep -n "meta" src/payload-types.ts | grep -i "PageContent\|page-content"` then inspect the `PageContent` interface.
Expected: the `PageContent` interface now has a `meta?: { title?: ...; description?: ...; image?: ... }` member.

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm lint`
Expected: no errors. (No unit test here — a `tabs`/field config change is a declarative Payload config; its correctness is verified by type generation and the integration behavior exercised in Tasks 3–5.)

- [ ] **Step 5: Commit**

```bash
git add src/collections/PageContent/index.ts src/payload-types.ts
git commit -m "feat: add localized SEO tab to page-content collection"
```

---

### Task 3: Teach the SEO plugin the `pageKey → path` convention

Extract the existing `pageKeyToPath` helper into a shared util (DRY with the revalidate hook), and branch `generateTitle` / `generateURL` on `page-content` docs so the admin Preview/Overview buttons produce correct URLs.

**Files:**
- Create: `src/utilities/pageKeyToPath.ts`
- Create: `tests/int/pageKeyToPath.int.spec.ts`
- Modify: `src/collections/PageContent/hooks/revalidatePageContent.ts:9-10` (use shared helper)
- Modify: `src/plugins/index.ts:13,15-24` (types + generate fns)

**Interfaces:**
- Produces: `pageKeyToPath(pageKey: string): string` — `'home' → ''`, otherwise `'/<pageKey>'`.
- Consumes: `PageContent` type from `@/payload-types` (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
// tests/int/pageKeyToPath.int.spec.ts
import { describe, expect, it } from 'vitest'

import { pageKeyToPath } from '@/utilities/pageKeyToPath'

describe('pageKeyToPath', () => {
  it('maps the home key to the site root', () => {
    expect(pageKeyToPath('home')).toBe('')
  })

  it('prefixes any other key with a slash', () => {
    expect(pageKeyToPath('pricing')).toBe('/pricing')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:int pageKeyToPath`
Expected: FAIL — cannot resolve `@/utilities/pageKeyToPath`.

- [ ] **Step 3: Create the shared helper**

```ts
// src/utilities/pageKeyToPath.ts
// pageKey convention: 'home' → '' (site root), anything else → '/<pageKey>'.
// Single source of truth for how a page-content document maps onto a route,
// shared by revalidation and SEO URL generation.
export const pageKeyToPath = (pageKey: string) => (pageKey === 'home' ? '' : `/${pageKey}`)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:int pageKeyToPath`
Expected: PASS (2 tests).

- [ ] **Step 5: Reuse the helper in the revalidate hook**

In `src/collections/PageContent/hooks/revalidatePageContent.ts`, delete the local `pageKeyToPath` definition (lines ~9-10) and import the shared one:

```ts
import { pageKeyToPath } from '@/utilities/pageKeyToPath'
```

Leave the rest of the hook unchanged (`toLocalizedPath` still calls `pageKeyToPath(pageKey)`).

- [ ] **Step 6: Branch the SEO generate functions on page-content**

In `src/plugins/index.ts`, extend the type import and the two generator functions. Replace the `Page, Post` import (line ~13) and the `generateTitle`/`generateURL` block (lines ~15-24):

```ts
import { Page, PageContent, Post } from '@/payload-types'
import { pageKeyToPath } from '@/utilities/pageKeyToPath'
```

```ts
const generateTitle: GenerateTitle<Post | Page | PageContent> = ({ doc }) => {
  const title = doc && 'title' in doc ? doc.title : undefined
  return title ? `${title} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<Post | Page | PageContent> = ({ doc }) => {
  const url = getServerSideURL()

  if (doc && 'pageKey' in doc && doc.pageKey) {
    return `${url}${pageKeyToPath(doc.pageKey)}`
  }

  return doc && 'slug' in doc && doc.slug ? `${url}/${doc.slug}` : url
}
```

(`page-content` has no `title` field, so its generated meta title falls back to the site name — honest, since there is no source title to derive from.)

- [ ] **Step 7: Verify all tests, types, and lint**

Run: `pnpm test:int pageKeyToPath && pnpm generate:types && pnpm lint`
Expected: tests PASS, no type/lint errors.

- [ ] **Step 8: Commit**

```bash
git add src/utilities/pageKeyToPath.ts tests/int/pageKeyToPath.int.spec.ts src/collections/PageContent/hooks/revalidatePageContent.ts src/plugins/index.ts
git commit -m "feat: generate SEO urls for page-content via shared pageKeyToPath"
```

---

### Task 4: Frontend metadata mapper + wire into the home page

Add a feature-local `buildPageMetadata` that reads `content.meta` with an i18n fallback, and make the home page's `generateMetadata` use it. This moves the SEO source of truth from i18n files to the CMS without regressing pages whose CMS meta is empty.

**Files:**
- Create: `src/app/(frontend)/_features/page-content/api/pageMetadata.ts`
- Create: `tests/int/pageMetadata.int.spec.ts`
- Modify: `src/app/(frontend)/_features/page-content/index.ts` (re-export)
- Modify: `src/app/(frontend)/[locale]/page.tsx:102-110` (`generateMetadata`)

**Interfaces:**
- Consumes: `PageContent` (Task 2), `fetchPageContent` (existing), `mergeOpenGraph`/`getServerSideURL` (existing utils).
- Produces: `buildPageMetadata(content: PageContent | null, fallback: { title: string; description: string }): Metadata`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/int/pageMetadata.int.spec.ts
import { describe, expect, it } from 'vitest'

import type { PageContent } from '@/payload-types'

import { buildPageMetadata } from '@frontend/_features/page-content/api/pageMetadata'

const fallback = { title: 'Fallback Title', description: 'Fallback Description' }

const ogImages = (metadata: ReturnType<typeof buildPageMetadata>) =>
  (metadata.openGraph?.images as { url: string }[]) ?? []

describe('buildPageMetadata', () => {
  it('uses CMS meta when present', () => {
    const content = {
      meta: { title: 'CMS Title', description: 'CMS Description' },
    } as unknown as PageContent

    const result = buildPageMetadata(content, fallback)

    expect(result.title).toBe('CMS Title')
    expect(result.description).toBe('CMS Description')
  })

  it('falls back to i18n values when meta is missing', () => {
    const result = buildPageMetadata(null, fallback)

    expect(result.title).toBe('Fallback Title')
    expect(result.description).toBe('Fallback Description')
  })

  it('falls back per-field when a single meta field is empty', () => {
    const content = { meta: { title: 'CMS Title' } } as unknown as PageContent

    const result = buildPageMetadata(content, fallback)

    expect(result.title).toBe('CMS Title')
    expect(result.description).toBe('Fallback Description')
  })

  it('maps a media image to an absolute OG url', () => {
    const content = {
      meta: { title: 'CMS Title', image: { url: '/media/hero.png' } },
    } as unknown as PageContent

    const result = buildPageMetadata(content, fallback)

    expect(ogImages(result)[0]?.url).toContain('/media/hero.png')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:int pageMetadata`
Expected: FAIL — cannot resolve `pageMetadata`.

- [ ] **Step 3: Implement the mapper**

```ts
// src/app/(frontend)/_features/page-content/api/pageMetadata.ts
import type { Metadata } from 'next'

import type { Media, PageContent } from '@/payload-types'

import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

type MetaFallback = {
  title: string
  description: string
}

type PageMeta = NonNullable<PageContent['meta']>

const resolveImageUrl = (image: PageMeta['image']): string | undefined => {
  if (!image || typeof image !== 'object') return undefined

  const media = image as Media
  const ogUrl = media.sizes && media.sizes.og ? media.sizes.og.url : undefined
  const relativeUrl = ogUrl || media.url

  if (!relativeUrl) return undefined

  return `${getServerSideURL()}${relativeUrl}`
}

// Source of truth for hand-coded page SEO is the CMS `meta` group; any field
// left empty falls back to the page's i18n values so nothing regresses before
// editors fill it in.
export const buildPageMetadata = (
  content: PageContent | null,
  fallback: MetaFallback,
): Metadata => {
  const meta = content && content.meta ? content.meta : null
  const title = meta && meta.title ? meta.title : fallback.title
  const description = meta && meta.description ? meta.description : fallback.description
  const imageUrl = meta ? resolveImageUrl(meta.image) : undefined
  const images = imageUrl ? [{ url: imageUrl }] : undefined

  return {
    title,
    description,
    openGraph: mergeOpenGraph({ title, description, images }),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:int pageMetadata`
Expected: PASS (4 tests).

- [ ] **Step 5: Re-export from the feature public API**

In `src/app/(frontend)/_features/page-content/index.ts`, add `buildPageMetadata` to the existing `./api/pageContent` re-export block or a new line:

```ts
export { buildPageMetadata } from './api/pageMetadata'
```

- [ ] **Step 6: Wire the home page's `generateMetadata`**

In `src/app/(frontend)/[locale]/page.tsx`, import `buildPageMetadata` from `@frontend/_features/page-content` (add to the existing import list) and replace `generateMetadata` (lines ~102-110):

```ts
export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Home.meta' })

  const content = await fetchPageContent(HOME_PAGE_KEY, locale)
  const fallback = { title: t('title'), description: t('description') }

  return buildPageMetadata(content, fallback)
}
```

(`fetchPageContent` is already imported and is `cache()`-memoized with the same `(HOME_PAGE_KEY, locale)` args as the page render, so this adds no extra DB hit.)

- [ ] **Step 7: Verify tests, types, lint**

Run: `pnpm test:int && pnpm generate:types && pnpm lint`
Expected: all int tests PASS, no type/lint errors.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(frontend)/_features/page-content/api/pageMetadata.ts" tests/int/pageMetadata.int.spec.ts "src/app/(frontend)/_features/page-content/index.ts" "src/app/(frontend)/[locale]/page.tsx"
git commit -m "feat: source hand-coded page SEO from page-content meta with i18n fallback"
```

---

### Task 5: Seed default SEO for the home page

Populate `meta` when the `home` `page-content` document is first created, so a fresh seed ships with non-empty SEO. Do not overwrite an existing document's `meta` (editors own it once created).

**Files:**
- Modify: `scripts/enrich-home-content.ts:378-407` (`enrichHomeContent`)

**Interfaces:**
- Consumes: `PageContent['meta']` shape (Task 2).

- [ ] **Step 1: Add a default meta constant**

Near the other module constants at the top of `scripts/enrich-home-content.ts`, add:

```ts
const HOME_META = {
  title: 'DrugCard: Comprehensive Literature Screening & Pharmacovigilance Solutions',
  description:
    'DrugCard - AI-powered pharmacovigilance tools & services for automated literature monitoring, regulatory intelligence and adverse events management.',
}
```

(Copy taken verbatim from the live site's `<title>` and `<meta name="description">` at https://drug-card.io/.)

- [ ] **Step 2: Set meta only on create**

In `enrichHomeContent`, add `meta: HOME_META` to the `payload.create` data so a brand-new home document ships with SEO. Leave the `payload.update` branch untouched so an existing document's editor-managed `meta` is never clobbered:

```ts
  if (!homeDoc) {
    await payload.create({
      collection: 'page-content',
      context: { disableRevalidate: true },
      data: { pageKey: 'home', sections, meta: HOME_META },
      locale: 'en',
    })
    payload.logger.info(`Created page-content "home" (images: ${media ? 'attached' : 'skipped'})`)
  } else {
    await payload.update({
      collection: 'page-content',
      context: { disableRevalidate: true },
      data: { sections },
      id: homeDoc.id,
      locale: 'en',
    })
    payload.logger.info(`Updated page-content "home" (images: ${media ? 'attached' : 'skipped'})`)
  }
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm lint`
Expected: no errors (the seed `data` now matches the regenerated `PageContent` create type).

- [ ] **Step 4: Verify the seed applies (manual, on a fresh/empty home doc)**

Run: `pnpm seed:home`
Expected: log line `Created page-content "home"` on a fresh DB; querying the home doc shows `meta.title`/`meta.description` populated. (On a DB where `home` already exists the update branch runs and `meta` is intentionally left as-is.)

- [ ] **Step 5: Commit**

```bash
git add scripts/enrich-home-content.ts
git commit -m "feat: seed default SEO meta for the home page"
```

---

## Self-Review

**Spec coverage:**
- SEO on `page-content` (Variant A) → Task 2.
- Shared `metaTab` factory, refactor `pages` → Task 1.
- `payload-types` regen → Tasks 2, 3, 4.
- `seoPlugin` generate fns handle `page-content` / `pageKey → path`, reuse revalidate mapping → Task 3.
- Frontend mapper `buildPageMetadata`, CMS-as-source-of-truth with i18n fallback, wired into hand-coded page → Task 4.
- Seed default meta → Task 5.
- `sections` optional (SEO-only doc) → preserved in Task 2 (not made required); stated in Global Constraints.
- Localized `meta.title/description` → Task 1 factory (`localized: true`), asserted by Task 1 test.

**Note on other hand-coded pages:** only the home route (`[locale]/page.tsx`) fetches `page-content` today, so it is the only `generateMetadata` to wire (Task 4). When future hand-coded pages adopt `page-content`, reuse `buildPageMetadata` the same way — no further plan changes needed.

**Out of scope (Roadmap — separate plans):** removing the `pages` collection; adding drafts + live preview to `page-content`.

**Placeholder scan:** none — every code step contains full code; `HOME_META` uses the live site's real `<title>`/`<meta description>` copy (Task 5 Step 1).

**Type consistency:** `pageKeyToPath` (Task 3) returns `''`/`'/<key>'` and is consumed by both the revalidate hook and `generateURL`. `buildPageMetadata(content, fallback)` signature is identical in its definition (Task 4 Step 3), test (Step 1), and home-page call site (Step 6). `metaTab` shape (`name: 'meta'`) matches its consumers in Tasks 1 and 2.
