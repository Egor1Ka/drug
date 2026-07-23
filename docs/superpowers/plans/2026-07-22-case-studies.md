# Case Studies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public **Case Studies** section mirroring drug-card.io: a Payload collection with a structured "at a glance" snapshot, a `/case-studies` listing (no pagination), a `/case-study/[slug]` detail page with snapshot + rich body + CTA, and its own sitemap.

**Architecture:** Clone the already-shipped **News** feature end-to-end (collection → feature `api/`+`ui/` → thin routes → sitemap) and extend it with structured snapshot fields (`clientName`, `clientLogo`, `region`, `productCount`, `resultMetric`) and a bottom CTA that reuses the existing `ContactModalTrigger`. Detail route is **singular** (`/case-study/[slug]`) to mirror the original site; listing is plural (`/case-studies`).

**Tech Stack:** Payload CMS 3.86, Next.js App Router, next-intl, `@payloadcms/plugin-seo`, next-sitemap, Tailwind.

## Global Constraints

- Detail URL is **singular**: `/case-study/<slug>`. Listing URL is **plural**: `/case-studies`. Collection slug is `case-studies`.
- No automated tests exist in this repo (News shipped without any); verify each task with `pnpm generate:types`, `pnpm lint`, `pnpm build`, and manual admin/route checks. Do **not** scaffold vitest/playwright specs.
- No pagination on the listing (~9 case studies): `fetchAllCaseStudies` uses `limit: 100`.
- Follow project rules: `const` only, named callbacks (no inline lambdas with logic), guard clauses, `<Show>` over `&&` in page JSX, feature imports only from the feature root, `api/` owns all Payload access.
- Do **not** run `git commit` — the user commits themselves. "Commit" steps below are marked optional; stage only.

---

### Task 1: Collection `CaseStudies` + revalidate hook + registration

**Files:**
- Create: `src/collections/CaseStudies/index.ts`
- Create: `src/collections/CaseStudies/hooks/revalidateCaseStudies.ts`
- Modify: `src/payload.config.ts` (import + `collections` array)
- Modify: `src/utilities/generatePreviewPath.ts` (`collectionPrefixMap`)
- Generated: `src/payload-types.ts` (via `pnpm generate:types`)

**Interfaces:**
- Produces: collection slug `'case-studies'`; TS type `CaseStudy` in `@/payload-types`; hooks `revalidateCaseStudies`, `revalidateCaseStudiesDelete`.

- [ ] **Step 1: Create the revalidate hook**

Create `src/collections/CaseStudies/hooks/revalidateCaseStudies.ts`:

```ts
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { CaseStudy } from '../../../payload-types'

const revalidateCaseStudiesListing = () => {
  revalidatePath('/case-studies')
}

const revalidateCaseStudyItem = (slug?: string | null) => {
  if (!slug) return

  revalidatePath(`/case-study/${slug}`)
  revalidateCaseStudiesListing()
  revalidateTag('case-studies-sitemap', 'max')
}

export const revalidateCaseStudies: CollectionAfterChangeHook<CaseStudy> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  if (doc._status === 'published') {
    payload.logger.info(`Revalidating case study at path: /case-study/${doc.slug}`)
    revalidateCaseStudyItem(doc.slug)
  }

  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    revalidateCaseStudyItem(previousDoc.slug)
  }

  return doc
}

export const revalidateCaseStudiesDelete: CollectionAfterDeleteHook<CaseStudy> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  revalidateCaseStudyItem(doc?.slug)

  return doc
}
```

- [ ] **Step 2: Create the collection**

Create `src/collections/CaseStudies/index.ts`:

```ts
import type { CollectionConfig } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  OrderedListFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Banner } from '../../blocks/Banner/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateCaseStudies, revalidateCaseStudiesDelete } from './hooks/revalidateCaseStudies'

// Customer success stories, kept separate from the blog: its own /case-studies
// listing, /case-study/<slug> detail, sitemap and menu item (mirrors the
// original drug-card.io case studies section).
export const CaseStudies: CollectionConfig<'case-studies'> = {
  slug: 'case-studies',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  defaultPopulate: {
    title: true,
    slug: true,
    clientName: true,
    clientLogo: true,
    region: true,
    resultMetric: true,
    excerpt: true,
    publishedAt: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'clientName', 'publishedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'case-studies',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'case-studies',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'clientName',
              type: 'text',
              required: true,
              admin: {
                description: 'Client / company name shown in the snapshot box.',
              },
            },
            {
              name: 'clientLogo',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'region',
              type: 'text',
              localized: true,
              admin: {
                description: 'e.g. "Spain", "Europe (16 countries)".',
              },
            },
            {
              name: 'productCount',
              type: 'number',
              admin: {
                description: 'Number of products managed (optional).',
              },
            },
            {
              name: 'resultMetric',
              type: 'text',
              localized: true,
              admin: {
                description: 'Headline result, e.g. "94% Faster Article Review".',
              },
            },
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'excerpt',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Short summary shown on the /case-studies listing cards.',
              },
            },
            {
              name: 'content',
              type: 'richText',
              localized: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    UnorderedListFeature(),
                    OrderedListFeature(),
                    BlocksFeature({ blocks: [Banner, MediaBlock, CallToAction] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: true,
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
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
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidateCaseStudies],
    afterDelete: [revalidateCaseStudiesDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
```

- [ ] **Step 3: Register in `generatePreviewPath`**

In `src/utilities/generatePreviewPath.ts`, extend `collectionPrefixMap` (note singular path):

```ts
const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/blog',
  news: '/news',
  'case-studies': '/case-study',
}
```

- [ ] **Step 4: Register in `payload.config.ts`**

Add the import near the other collection imports:

```ts
import { CaseStudies } from './collections/CaseStudies'
```

Add `CaseStudies` to the `collections` array:

```ts
  collections: [PageContent, Posts, News, CaseStudies, Media, Categories, Tags, Authors, Users],
```

- [ ] **Step 5: Generate types**

Run: `pnpm generate:types`
Expected: exits 0; `src/payload-types.ts` now contains a `CaseStudy` interface and `'case-studies'` in `Config['collections']`. Confirm with:

Run: `grep -n "CaseStudy" src/payload-types.ts | head`
Expected: at least one match (the `CaseStudy` interface).

- [ ] **Step 6: Lint the new files**

Run: `pnpm lint`
Expected: no errors for the new collection/hook files.

- [ ] **Step 7 (optional): Stage**

```bash
git add src/collections/CaseStudies src/payload.config.ts src/utilities/generatePreviewPath.ts src/payload-types.ts
```

---

### Task 2: Data layer `api/case-studies.ts`

**Files:**
- Create: `src/app/(frontend)/_features/case-studies/api/case-studies.ts`

**Interfaces:**
- Consumes: collection slug `'case-studies'`, type `CaseStudy` (Task 1).
- Produces:
  - `CASE_STUDY_CARD_SELECT` (const select object)
  - `fetchAllCaseStudies({ locale }: { locale: TypedLocale }) => Promise<PaginatedDocs<CaseStudy>>`
  - `fetchCaseStudyBySlug(slug: string, locale: TypedLocale) => Promise<CaseStudy | null>`
  - `fetchAllCaseStudySlugs() => Promise<Pick<CaseStudy, 'slug'>[]>`

- [ ] **Step 1: Create the api module**

Create `src/app/(frontend)/_features/case-studies/api/case-studies.ts`:

```ts
import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { getPayload, type TypedLocale } from 'payload'
import { cache } from 'react'

// ~9 case studies total — one page, no pagination.
export const CASE_STUDIES_LIMIT = 100

// Field set every case-study card renders — single source for listing queries.
export const CASE_STUDY_CARD_SELECT = {
  title: true,
  slug: true,
  clientName: true,
  clientLogo: true,
  region: true,
  resultMetric: true,
  excerpt: true,
  publishedAt: true,
  meta: true,
} as const

type AllCaseStudiesArgs = {
  locale: TypedLocale
}

export const fetchAllCaseStudies = async ({ locale }: AllCaseStudiesArgs) => {
  const payload = await getPayload({ config: configPromise })

  return payload.find({
    collection: 'case-studies',
    depth: 1,
    limit: CASE_STUDIES_LIMIT,
    locale,
    overrideAccess: false,
    pagination: false,
    select: CASE_STUDY_CARD_SELECT,
    sort: '-publishedAt',
  })
}

// Primitive arguments keep React cache() memoization working across
// the page render and generateMetadata — one DB hit per request.
export const fetchCaseStudyBySlug = cache(async (slug: string, locale: TypedLocale) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'case-studies',
    draft,
    limit: 1,
    locale,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})

export const fetchAllCaseStudySlugs = async () => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'case-studies',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return result.docs
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm generate:types && pnpm lint`
Expected: exits 0, no type/lint errors in the new module.

---

### Task 3: UI components (`ui/`) + feature public API

**Files:**
- Create: `src/app/(frontend)/_features/case-studies/ui/CaseStudyCard.tsx`
- Create: `src/app/(frontend)/_features/case-studies/ui/CaseStudyArchive.tsx`
- Create: `src/app/(frontend)/_features/case-studies/ui/CaseStudySnapshot.tsx`
- Create: `src/app/(frontend)/_features/case-studies/ui/CaseStudyListingLayout.tsx`
- Create: `src/app/(frontend)/_features/case-studies/ui/CaseStudyPostLayout.tsx`
- Create: `src/app/(frontend)/_features/case-studies/ui/CaseStudyCta.tsx`
- Create: `src/app/(frontend)/_features/case-studies/index.ts`

**Interfaces:**
- Consumes: `CaseStudy` type, `CASE_STUDY_CARD_SELECT`/`fetch*` (Task 2), `Show` (`@frontend/_shared/ui/Show`), `Media` (`@/components/Media`), `formatBlogDate` (`@/utilities/formatBlogDate`), `ContactModalTrigger` (`@frontend/_features/contact`).
- Produces (exported from `index.ts`): `CaseStudyArchive`, `CaseStudyCard`, `CaseStudyCardItem`, `CaseStudySnapshot`, `CaseStudyListingLayout`, `CaseStudyPostLayout`, `CaseStudyCta`, `CASE_STUDIES_LIMIT`, `CASE_STUDY_CARD_SELECT`, `fetchAllCaseStudies`, `fetchCaseStudyBySlug`, `fetchAllCaseStudySlugs`.

- [ ] **Step 1: Create `CaseStudyCard.tsx`**

```tsx
import Link from 'next/link'
import React from 'react'

import type { CaseStudy } from '@/payload-types'

import { Show } from '@frontend/_shared/ui/Show'
import { formatBlogDate } from '@/utilities/formatBlogDate'

export type CaseStudyCardItem = Pick<
  CaseStudy,
  'slug' | 'title' | 'excerpt' | 'publishedAt' | 'clientName' | 'region' | 'resultMetric'
>

export const CaseStudyCard: React.FC<{ item: CaseStudyCardItem }> = ({ item }) => {
  const { excerpt, publishedAt, region, resultMetric, slug, title } = item
  const href = `/case-study/${slug}`

  return (
    <article className="flex flex-col gap-3 py-8">
      <Show when={region}>
        <span className="text-sm font-medium text-primary">{region}</span>
      </Show>

      <h2 className="text-2xl font-semibold leading-snug">
        <Link href={href} className="hover:text-primary">
          {title}
        </Link>
      </h2>

      <Show when={resultMetric}>
        <p className="text-lg font-semibold">{resultMetric}</p>
      </Show>

      <Show when={excerpt}>
        <p className="text-muted-foreground">{excerpt}</p>
      </Show>

      <Show when={publishedAt}>
        <time className="text-sm text-muted-foreground" dateTime={publishedAt || undefined}>
          {publishedAt && formatBlogDate(publishedAt)}
        </time>
      </Show>

      <Link href={href} className="text-sm font-medium text-primary hover:opacity-90">
        Read case study &raquo;
      </Link>
    </article>
  )
}
```

- [ ] **Step 2: Create `CaseStudyArchive.tsx`**

```tsx
import React from 'react'

import { CaseStudyCard, type CaseStudyCardItem } from './CaseStudyCard'

const renderItem = (item: CaseStudyCardItem) => <CaseStudyCard key={item.slug} item={item} />

export const CaseStudyArchive: React.FC<{ items: CaseStudyCardItem[] }> = ({ items }) => (
  <div className="mx-auto max-w-[48rem] divide-y divide-border">{items.map(renderItem)}</div>
)
```

- [ ] **Step 3: Create `CaseStudySnapshot.tsx`**

```tsx
import React from 'react'

import type { CaseStudy } from '@/payload-types'

import { Media } from '@/components/Media'
import { Show } from '@frontend/_shared/ui/Show'

type CaseStudySnapshotProps = Pick<
  CaseStudy,
  'clientName' | 'clientLogo' | 'region' | 'productCount' | 'resultMetric'
>

export const CaseStudySnapshot: React.FC<CaseStudySnapshotProps> = ({
  clientLogo,
  clientName,
  productCount,
  region,
  resultMetric,
}) => {
  const logo = clientLogo && typeof clientLogo === 'object' ? clientLogo : null

  return (
    <dl className="mt-8 grid grid-cols-2 gap-6 rounded-lg border border-border bg-muted/40 p-6 md:grid-cols-4">
      <div className="col-span-2 flex items-center gap-4 md:col-span-1">
        <Show when={logo}>
          <Media imgClassName="h-12 w-auto object-contain" resource={logo} />
        </Show>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Client</dt>
          <dd className="text-lg font-semibold">{clientName}</dd>
        </div>
      </div>

      <Show when={region}>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Location</dt>
          <dd className="text-lg font-semibold">{region}</dd>
        </div>
      </Show>

      <Show when={typeof productCount === 'number'}>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Products</dt>
          <dd className="text-lg font-semibold">{productCount}</dd>
        </div>
      </Show>

      <Show when={resultMetric}>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Result</dt>
          <dd className="text-lg font-semibold">{resultMetric}</dd>
        </div>
      </Show>
    </dl>
  )
}
```

- [ ] **Step 4: Create `CaseStudyListingLayout.tsx`**

```tsx
import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => <div className="pt-24 pb-24">{children}</div>

const Header: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-10">{children}</div>
)

const Content: React.FC<SlotProps> = ({ children }) => <div className="container">{children}</div>

export const CaseStudyListingLayout = Object.assign(Root, { Content, Header })
```

- [ ] **Step 5: Create `CaseStudyPostLayout.tsx`**

```tsx
import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => <div className="pt-24 pb-24">{children}</div>

const Header: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-8">{children}</div>
)

const Snapshot: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-12">
    <div className="mx-auto max-w-[48rem]">{children}</div>
  </div>
)

const Content: React.FC<SlotProps> = ({ children }) => <div className="container">{children}</div>

const Cta: React.FC<SlotProps> = ({ children }) => (
  <div className="container mt-16">{children}</div>
)

export const CaseStudyPostLayout = Object.assign(Root, { Content, Cta, Header, Snapshot })
```

- [ ] **Step 6: Create `CaseStudyCta.tsx`** (reuses the contact modal, mirrors "Ready to Achieve Similar Results?")

```tsx
import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'

export const CaseStudyCta: React.FC = () => (
  <section className="mx-auto max-w-[48rem] rounded-lg bg-primary px-8 py-12 text-center text-primary-foreground">
    <h2 className="text-3xl font-bold">Ready to Achieve Similar Results?</h2>
    <p className="mt-3 text-primary-foreground/90">
      Book a personalised demo and see what DrugCard can do for your team.
    </p>
    <ContactModalTrigger className="mt-6 inline-flex items-center rounded-md bg-background px-6 py-3 text-sm font-semibold text-foreground hover:opacity-90">
      Book a demo
    </ContactModalTrigger>
  </section>
)
```

- [ ] **Step 7: Create the feature public API `index.ts`**

```ts
// Public API of the case-studies feature —
// pages import ONLY from '@frontend/_features/case-studies'.

export { CaseStudyArchive } from './ui/CaseStudyArchive'
export { CaseStudyCard, type CaseStudyCardItem } from './ui/CaseStudyCard'
export { CaseStudySnapshot } from './ui/CaseStudySnapshot'
export { CaseStudyListingLayout } from './ui/CaseStudyListingLayout'
export { CaseStudyPostLayout } from './ui/CaseStudyPostLayout'
export { CaseStudyCta } from './ui/CaseStudyCta'

export {
  CASE_STUDIES_LIMIT,
  CASE_STUDY_CARD_SELECT,
  fetchAllCaseStudies,
  fetchAllCaseStudySlugs,
  fetchCaseStudyBySlug,
} from './api/case-studies'
```

- [ ] **Step 8: Lint**

Run: `pnpm lint`
Expected: exits 0, no errors in the new `ui/`/`index.ts` files.

---

### Task 4: Listing route `/case-studies`

**Files:**
- Create: `src/app/(frontend)/[locale]/case-studies/page.tsx`

**Interfaces:**
- Consumes: `CaseStudyArchive`, `CaseStudyListingLayout`, `fetchAllCaseStudies` (Task 3), `Show`, `AppLocale` (`@/i18n/routing`).

- [ ] **Step 1: Create the listing page**

```tsx
import type { Metadata } from 'next/types'

import { setRequestLocale } from 'next-intl/server'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { Show } from '@frontend/_shared/ui/Show'
import {
  CaseStudyArchive,
  CaseStudyListingLayout,
  fetchAllCaseStudies,
} from '@frontend/_features/case-studies'

export const revalidate = 600

type Args = {
  params: Promise<{ locale: AppLocale }>
}

export default async function CaseStudiesListingPage({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise

  setRequestLocale(locale)

  const caseStudies = await fetchAllCaseStudies({ locale })

  return (
    <CaseStudyListingLayout>
      <CaseStudyListingLayout.Header>
        <h1 className="text-4xl font-bold">Case Studies</h1>
        <p className="mt-3 text-muted-foreground">
          How pharmacovigilance teams transformed literature screening with DrugCard.
        </p>
      </CaseStudyListingLayout.Header>

      <CaseStudyListingLayout.Content>
        <Show when={caseStudies.docs.length > 0}>
          <CaseStudyArchive items={caseStudies.docs} />
        </Show>
      </CaseStudyListingLayout.Content>
    </CaseStudyListingLayout>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  await params

  return {
    title: 'Case Studies',
    description:
      'How pharmacovigilance teams transformed literature screening with DrugCard.',
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm generate:types && pnpm lint`
Expected: exits 0.

- [ ] **Step 3: Manual check**

Run: `pnpm dev`, open `/en/case-studies`.
Expected: page renders the heading; after Task 1 you can add a published case study in `/admin` and see its card. (Empty listing renders just the header — acceptable.)

---

### Task 5: Detail route `/case-study/[slug]`

**Files:**
- Create: `src/app/(frontend)/[locale]/case-study/[slug]/page.tsx`
- Create: `src/app/(frontend)/[locale]/case-study/[slug]/page.client.tsx`
- Modify: `src/utilities/generateMeta.ts` (widen `doc` param type to accept `CaseStudy`)

**Interfaces:**
- Consumes: `CaseStudyPostLayout`, `CaseStudySnapshot`, `CaseStudyCta`, `fetchAllCaseStudySlugs`, `fetchCaseStudyBySlug` (Task 3); `LivePreviewListener`, `Media`, `PayloadRedirects`, `RichText` (`@/components`), `Show`, `formatBlogDate`, `generateMeta`.
- Note: `ContactModalProvider` is already mounted in `src/app/(frontend)/[locale]/layout.tsx`, so `CaseStudyCta`'s `ContactModalTrigger` works without extra wiring.

- [ ] **Step 1: Create `page.client.tsx`**

```tsx
'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

const PageClient: React.FC = () => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])
  return <React.Fragment />
}

export default PageClient
```

- [ ] **Step 2: Create `page.tsx`**

```tsx
import type { Metadata } from 'next'

import { draftMode } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import { Show } from '@frontend/_shared/ui/Show'
import {
  CaseStudyCta,
  CaseStudyPostLayout,
  CaseStudySnapshot,
  fetchAllCaseStudySlugs,
  fetchCaseStudyBySlug,
} from '@frontend/_features/case-studies'
import { formatBlogDate } from '@/utilities/formatBlogDate'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

type Args = {
  params: Promise<{
    locale: AppLocale
    slug?: string
  }>
}

const toSlugParam = ({ slug }: { slug?: string | null }) => ({ slug })

export async function generateStaticParams() {
  const slugs = await fetchAllCaseStudySlugs()

  return slugs.map(toSlugParam)
}

export default async function CaseStudyItem({ params: paramsPromise }: Args) {
  const { locale, slug = '' } = await paramsPromise

  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const decodedSlug = decodeURIComponent(slug)
  const url = '/case-study/' + decodedSlug
  const item = await fetchCaseStudyBySlug(decodedSlug, locale)

  if (!item) return <PayloadRedirects url={url} />

  const hasContent = Boolean(item.content)
  const publishedDate = item.publishedAt ? formatBlogDate(item.publishedAt) : null
  const coverImage =
    item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null

  return (
    <CaseStudyPostLayout>
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <Show when={draft}>
        <LivePreviewListener />
      </Show>

      <CaseStudyPostLayout.Header>
        <div className="mx-auto max-w-[48rem]">
          <h1 className="text-3xl font-bold md:text-5xl">{item.title}</h1>

          <Show when={publishedDate}>
            <time
              className="mt-4 block text-sm text-muted-foreground"
              dateTime={item.publishedAt || undefined}
            >
              {publishedDate}
            </time>
          </Show>

          <Show when={coverImage}>
            <div className="mt-8 overflow-hidden rounded-lg">
              <Media imgClassName="w-full" priority resource={coverImage} />
            </div>
          </Show>
        </div>
      </CaseStudyPostLayout.Header>

      <CaseStudyPostLayout.Snapshot>
        <CaseStudySnapshot
          clientLogo={item.clientLogo}
          clientName={item.clientName}
          productCount={item.productCount}
          region={item.region}
          resultMetric={item.resultMetric}
        />
      </CaseStudyPostLayout.Snapshot>

      <Show when={hasContent}>
        <CaseStudyPostLayout.Content>
          <RichText className="mx-auto max-w-[48rem]" data={item.content} enableGutter={false} />
        </CaseStudyPostLayout.Content>
      </Show>

      <CaseStudyPostLayout.Cta>
        <CaseStudyCta />
      </CaseStudyPostLayout.Cta>
    </CaseStudyPostLayout>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale, slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const item = await fetchCaseStudyBySlug(decodedSlug, locale)

  return generateMeta({ doc: item })
}
```

- [ ] **Step 3: Widen `generateMeta` to accept `CaseStudy`**

`generateMeta` currently types `doc` as `Partial<Post> | Partial<News> | null`, so passing a `CaseStudy` will fail typecheck. In `src/utilities/generateMeta.ts`:

Add `CaseStudy` to the import:

```ts
import type { Media, News, Post, CaseStudy, Config } from '../payload-types'
```

Widen the param type:

```ts
export const generateMeta = async (args: {
  doc: Partial<Post> | Partial<News> | Partial<CaseStudy> | null
}): Promise<Metadata> => {
```

Runtime is unchanged — it only reads `doc.meta.*`, which `CaseStudy` has.

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm generate:types && pnpm lint`
Expected: exits 0.

- [ ] **Step 5: Manual check**

In `/admin`, create + publish a case study with client, logo, region, productCount, resultMetric, and Challenge/Solution/Results body. Open `/en/case-study/<slug>`.
Expected: title, date, cover, snapshot box (only filled fields), rich body, and the "Ready to Achieve Similar Results?" CTA opening the contact modal.

---

### Task 6: Sitemap `/case-studies-sitemap.xml` + next-sitemap config

**Files:**
- Create: `src/app/(frontend)/(sitemaps)/case-studies-sitemap.xml/route.ts`
- Modify: `next-sitemap.config.cjs` (`exclude`, `additionalSitemaps`)

**Interfaces:**
- Consumes: collection `'case-studies'` (Task 1); tag `case-studies-sitemap` revalidated by the hook (Task 1).

- [ ] **Step 1: Create the sitemap route** (note singular `/case-study/` in `loc`)

```ts
import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getCaseStudiesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const results = await payload.find({
      collection: 'case-studies',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const hasSlug = (item: { slug?: string | null }) => Boolean(item?.slug)

    const toSitemapEntry = (item: { slug?: string | null; updatedAt?: string | null }) => ({
      loc: `${SITE_URL}/case-study/${item?.slug}`,
      lastmod: item.updatedAt || dateFallback,
    })

    return results.docs ? results.docs.filter(hasSlug).map(toSitemapEntry) : []
  },
  ['case-studies-sitemap'],
  {
    tags: ['case-studies-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getCaseStudiesSitemap()

  return getServerSideSitemap(sitemap)
}
```

- [ ] **Step 2: Update `next-sitemap.config.cjs`**

Add `/case-studies-sitemap.xml` to the `exclude` array:

```js
  exclude: ['/posts-sitemap.xml', '/authors-sitemap.xml', '/news-sitemap.xml', '/case-studies-sitemap.xml', '/*', '/blog/*'],
```

Add to `additionalSitemaps`:

```js
      `${SITE_URL}/case-studies-sitemap.xml`,
```

- [ ] **Step 3: Verify build + sitemap route**

Run: `pnpm build`
Expected: build succeeds; the route `(frontend)/(sitemaps)/case-studies-sitemap.xml` appears in the route list.

Run: `pnpm dev`, open `/case-studies-sitemap.xml`.
Expected: valid XML listing `${SITE_URL}/case-study/<slug>` for each published case study.

- [ ] **Step 4 (optional): Stage everything**

```bash
git add src/collections/CaseStudies src/app/\(frontend\)/_features/case-studies "src/app/(frontend)/[locale]/case-studies" "src/app/(frontend)/[locale]/case-study" "src/app/(frontend)/(sitemaps)/case-studies-sitemap.xml" src/payload.config.ts src/utilities/generatePreviewPath.ts next-sitemap.config.cjs src/payload-types.ts
```

---

## Final Verification (whole feature)

- [ ] `pnpm generate:types` — `CaseStudy` type present, no errors.
- [ ] `pnpm lint` — clean.
- [ ] `pnpm build` — succeeds; new routes (`/[locale]/case-studies`, `/[locale]/case-study/[slug]`, `case-studies-sitemap.xml`) listed.
- [ ] `/admin` → create/publish a case study; snapshot fields save.
- [ ] `/en/case-studies` — card appears (region tag, title, metric, excerpt, date).
- [ ] `/en/case-study/<slug>` — snapshot box, rich body, CTA modal opens.
- [ ] `/case-studies-sitemap.xml` — lists singular `/case-study/<slug>` URLs.
- [ ] Locale check: switch locale prefix, localized fields (`title`, `region`, `resultMetric`, `excerpt`, `content`) resolve.
- [ ] Draft preview: unpublished case study visible via live preview, not on public listing.

## Notes / Menu

The "Case Studies" menu link is added by a content editor in the `Header` global (navItems are editable) pointing to `/case-studies` — no code change, same as News.
