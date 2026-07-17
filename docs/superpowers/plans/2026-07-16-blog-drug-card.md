# drug-card.io-Style Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the template's posts frontend as a `/blog` section that mirrors drug-card.io/blog (card grid listing with category tabs, article page with breadcrumbs/read-time/tags/similar-posts, tag pages) and import three real articles via the site's open WordPress REST API.

**Architecture:** Adapt the existing Payload website template in place: add a `tags` collection and extend the `posts` collection (tags field, list/table lexical features, CTA block), rename the `(frontend)/posts` route group to `(frontend)/blog`, replace the listing/article UI with new components, and add a standalone `payload run` import script that converts WP HTML to Lexical with `convertHTMLToLexical`.

**Tech Stack:** Payload 3.86.0 (MongoDB adapter), Next.js 16 App Router, React 19, Tailwind, `@payloadcms/richtext-lexical`, jsdom 28 (already a dependency), vitest (int tests in `tests/int/**/*.int.spec.ts`), pnpm.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-16-blog-drug-card-design.md`. Blog only — no case studies.
- All public URLs live under `/blog`: `/blog`, `/blog/page/[n]`, `/blog/[slug]`, `/blog/tag/[slug]`. Category filter is `/blog?category=<slug>&page=<n>`.
- Listing is a card grid: 3 columns desktop / 2 tablet / 1 mobile. Card order: image → date + author → title → "Learn more" button.
- Dates render as `DD/MM/YYYY`. Read time = words ÷ 200 wpm, rounded up, minimum 1.
- Articles to import (English, as-is): `pbrer-vs-psur-key-differences-in-pharmacovigilance-drugcard`, `pharmacovigilance-automation-transforming-drug-safety-processes-drugcard`, `what-is-drug-safety-and-pharmacovigilance-explained-drugcard`. Source API: `https://drug-card.io/wp-json/wp/v2` (verified publicly readable, `_embed` returns terms + featured media).
- User's JS style rules (from ~/.claude/rules, apply to all NEW code): `const` only; no `for`/`while` loops; every `map`/`filter`/`forEach` callback is a named function (currying for parameterized callbacks); no argument mutation; guard clauses without optional chaining (`if (!a || !a.b)`); readability over brevity. Existing template code you merely touch keeps its idiom.
- `src/payload-types.ts` is generated — never edit by hand; run `pnpm generate:types` after collection changes and commit the result.
- Tasks 7–8 need `.env` `DATABASE_URL` pointing at a running MongoDB (a `.env` already exists) and network access to drug-card.io.
- Run commands from the repo root `/Users/egorzozula/Desktop/drug`. Package manager: `pnpm`.

---

### Task 1: Tags collection + Posts collection extensions

**Files:**
- Create: `src/collections/Tags.ts`
- Modify: `src/payload.config.ts` (collections array)
- Modify: `src/collections/Posts/index.ts` (editor features, tags field, defaultPopulate)

**Interfaces:**
- Consumes: existing `slugField` from `payload`, `anyone`/`authenticated` access helpers, `CallToAction` block config (`src/blocks/CallToAction/config.ts`, slug `cta`).
- Produces: collection slug `'tags'` (fields `title`, `slug`); `posts.tags` relationship (`hasMany`); generated types `Tag` and `Post['tags']` in `src/payload-types.ts`. Posts lexical content supports ul/ol lists and tables (needed by Task 7's HTML conversion and Task 8's rendering check).

- [ ] **Step 1: Create the Tags collection (mirror of Categories)**

```ts
// src/collections/Tags.ts
import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from 'payload'

export const Tags: CollectionConfig = {
  slug: 'tags',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField({
      position: undefined,
    }),
  ],
}
```

- [ ] **Step 2: Register Tags in `src/payload.config.ts`**

Add the import next to the other collection imports and extend the array:

```ts
import { Tags } from './collections/Tags'
// ...
collections: [Pages, Posts, Media, Categories, Tags, Users],
```

- [ ] **Step 3: Extend `src/collections/Posts/index.ts`**

3a. Add to the `@payloadcms/richtext-lexical` import list: `EXPERIMENTAL_TableFeature`, `OrderedListFeature`, `UnorderedListFeature`.

3b. Add the CTA block import next to the other block imports:

```ts
import { CallToAction } from '../../blocks/CallToAction/config'
```

3c. Replace the editor `features` return array with:

```ts
return [
  ...rootFeatures,
  HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
  UnorderedListFeature(),
  OrderedListFeature(),
  EXPERIMENTAL_TableFeature(),
  BlocksFeature({ blocks: [Banner, Code, MediaBlock, CallToAction] }),
  FixedToolbarFeature(),
  InlineToolbarFeature(),
  HorizontalRuleFeature(),
]
```

3d. In the `Meta` tab, add a `tags` field directly after the `categories` field:

```ts
{
  name: 'tags',
  type: 'relationship',
  admin: {
    position: 'sidebar',
  },
  hasMany: true,
  relationTo: 'tags',
},
```

3e. Replace `defaultPopulate` so related-post cards get everything they render:

```ts
defaultPopulate: {
  title: true,
  slug: true,
  categories: true,
  tags: true,
  heroImage: true,
  publishedAt: true,
  authors: true,
  meta: {
    image: true,
    description: true,
  },
},
```

- [ ] **Step 4: Regenerate types and typecheck**

Run: `pnpm generate:types && pnpm exec tsc --noEmit`
Expected: types file regenerated; `grep -n "export interface Tag " src/payload-types.ts` finds the new interface; tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/collections/Tags.ts src/collections/Posts/index.ts src/payload.config.ts src/payload-types.ts
git commit -m "feat: add tags collection, lists/table/cta editor features for posts"
```

---

### Task 2: Blog date + read time utilities (TDD)

**Files:**
- Create: `src/utilities/formatBlogDate.ts`
- Create: `src/utilities/readTime.ts`
- Test: `tests/int/formatBlogDate.int.spec.ts`, `tests/int/readTime.int.spec.ts`

**Interfaces:**
- Produces: `formatBlogDate(timestamp: string): string` (DD/MM/YYYY) and `calculateReadTime(content: Post['content']): number` (minutes ≥ 1). Consumed by Tasks 4–6.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/int/formatBlogDate.int.spec.ts
import { describe, expect, it } from 'vitest'

import { formatBlogDate } from '@/utilities/formatBlogDate'

describe('formatBlogDate', () => {
  it('formats an ISO timestamp as DD/MM/YYYY', () => {
    expect(formatBlogDate('2026-07-06T12:00:00')).toBe('06/07/2026')
  })

  it('pads single-digit day and month with zeros', () => {
    expect(formatBlogDate('2026-01-03T12:00:00')).toBe('03/01/2026')
  })
})
```

```ts
// tests/int/readTime.int.spec.ts
import { describe, expect, it } from 'vitest'

import type { Post } from '@/payload-types'

import { calculateReadTime } from '@/utilities/readTime'

const textNode = (text: string) => ({ type: 'text', version: 1, text })

const paragraphNode = (text: string) => ({
  type: 'paragraph',
  version: 1,
  children: [textNode(text)],
})

const buildContent = (paragraphs: string[]): Post['content'] =>
  ({
    root: {
      type: 'root',
      children: paragraphs.map(paragraphNode),
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }) as Post['content']

const toWord = (_: unknown, index: number): string => `word${index}`
const wordsOf = (count: number): string => Array.from({ length: count }, toWord).join(' ')

describe('calculateReadTime', () => {
  it('returns 1 minute minimum for short content', () => {
    expect(calculateReadTime(buildContent(['hello world']))).toBe(1)
  })

  it('rounds up at 200 words per minute', () => {
    expect(calculateReadTime(buildContent([wordsOf(401)]))).toBe(3)
  })

  it('counts words across nested children', () => {
    expect(calculateReadTime(buildContent([wordsOf(150), wordsOf(150)]))).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/formatBlogDate.int.spec.ts tests/int/readTime.int.spec.ts`
Expected: FAIL — cannot resolve `@/utilities/formatBlogDate` / `@/utilities/readTime`.

- [ ] **Step 3: Implement the utilities**

```ts
// src/utilities/formatBlogDate.ts
export const formatBlogDate = (timestamp: string): string => {
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}
```

```ts
// src/utilities/readTime.ts
import type { Post } from '@/payload-types'

type UnknownNode = { [key: string]: unknown }

const WORDS_PER_MINUTE = 200

const isText = (value: unknown): value is string => typeof value === 'string'
const isNodeArray = (value: unknown): value is UnknownNode[] => Array.isArray(value)

const collectText = (node: UnknownNode): string => {
  const ownText = isText(node.text) ? node.text : ''
  const children = isNodeArray(node.children) ? node.children : []
  const childTexts = children.map(collectText)

  return [ownText, ...childTexts].join(' ')
}

export const calculateReadTime = (content: Post['content']): number => {
  const text = collectText(content.root as unknown as UnknownNode)
  const words = text.split(/\s+/).filter(Boolean)

  return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/formatBlogDate.int.spec.ts tests/int/readTime.int.spec.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/formatBlogDate.ts src/utilities/readTime.ts tests/int/formatBlogDate.int.spec.ts tests/int/readTime.int.spec.ts
git commit -m "feat: add blog date formatter and read time utilities"
```

---

### Task 3: Rename routes `/posts` → `/blog` and update every path reference

**Files:**
- Rename: `src/app/(frontend)/posts/` → `src/app/(frontend)/blog/` (whole directory)
- Modify: `src/utilities/generatePreviewPath.ts`, `src/collections/Posts/hooks/revalidatePost.ts`, `src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts`, `src/components/Card/index.tsx`, `src/components/RichText/index.tsx`, `src/components/Pagination/index.tsx`, `src/app/(frontend)/blog/[slug]/page.tsx`, `src/endpoints/seed/*.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: all internal links, revalidation paths, preview paths and sitemap entries point to `/blog/...`. Collection slug stays `posts`; cache tag stays `posts-sitemap`; sitemap URL stays `/posts-sitemap.xml`.

- [ ] **Step 1: Rename the route directory**

```bash
git mv "src/app/(frontend)/posts" "src/app/(frontend)/blog"
```

- [ ] **Step 2: Update path strings**

2a. `src/utilities/generatePreviewPath.ts` line 5: `posts: '/posts',` → `posts: '/blog',`

2b. `src/collections/Posts/hooks/revalidatePost.ts`: replace all three template literals `` `/posts/${...}` `` with `` `/blog/${...}` `` (lines 14, 24, 37). Do NOT touch `revalidateTag('posts-sitemap', ...)`.

2c. `src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts` line 38: `loc: \`${SITE_URL}/posts/${post?.slug}\`` → `loc: \`${SITE_URL}/blog/${post?.slug}\``

2d. `src/components/Card/index.tsx` line 30 — posts must link to /blog while other collections keep their path:

```ts
const href = relationTo === 'posts' ? `/blog/${slug}` : `/${relationTo}/${slug}`
```

2e. `src/components/RichText/index.tsx` line 35: `return relationTo === 'posts' ? \`/posts/${slug}\` : \`/${slug}\`` → `` return relationTo === 'posts' ? `/blog/${slug}` : `/${slug}` ``

2f. `src/components/Pagination/index.tsx`: replace all four `/posts/page/` strings with `/blog/page/` (full rewrite comes in Task 4; this keeps links working between commits).

2g. `src/app/(frontend)/blog/[slug]/page.tsx` line 49: `const url = '/posts/' + decodedSlug` → `const url = '/blog/' + decodedSlug`

2h. Seed data:

```bash
grep -rln "/posts" src/endpoints/seed | xargs sed -i '' 's|/posts|/blog|g'
```

- [ ] **Step 3: Verify no stale references remain**

Run: `grep -rn "/posts" src --include="*.ts" --include="*.tsx" | grep -v "posts-sitemap" | grep -v payload-types`
Expected: no output.

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move blog routes from /posts to /blog"
```

---

### Task 4: Listing redesign — card grid, category tabs, pagination

**Files:**
- Create: `src/components/BlogCard/index.tsx`, `src/components/BlogArchive/index.tsx`, `src/components/CategoryTabs/index.tsx`
- Modify (full rewrite): `src/components/Pagination/index.tsx`, `src/app/(frontend)/blog/page.tsx`, `src/app/(frontend)/blog/page/[pageNumber]/page.tsx`

**Interfaces:**
- Consumes: `formatBlogDate` (Task 2), `Media` component, `formatAuthors` utility, `cn` from `@/utilities/ui`.
- Produces:
  - `BlogCard: React.FC<{ post: BlogCardPost }>` and `BlogCardPost = Pick<Post, 'slug' | 'title' | 'heroImage' | 'meta' | 'publishedAt' | 'populatedAuthors'>`
  - `blogCardSelect` — the payload `select` object every blog listing query uses (exported from the BlogCard file)
  - `BlogArchive: React.FC<{ posts: BlogCardPost[] }>` — the bare grid (callers wrap it in `.container`)
  - `CategoryTabs: React.FC<{ activeSlug?: string; categories: Category[] }>`
  - `Pagination` gains optional `hrefPattern?: string` prop containing a `{page}` placeholder (default `'/blog/page/{page}'`). Tasks 5–6 rely on these exact names.

- [ ] **Step 1: Create `src/components/BlogCard/index.tsx`**

```tsx
import Link from 'next/link'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'
import { formatBlogDate } from '@/utilities/formatBlogDate'

export type BlogCardPost = Pick<
  Post,
  'slug' | 'title' | 'heroImage' | 'meta' | 'publishedAt' | 'populatedAuthors'
>

export const blogCardSelect = {
  authors: true,
  categories: true,
  heroImage: true,
  meta: true,
  publishedAt: true,
  slug: true,
  title: true,
} as const

export const BlogCard: React.FC<{ post: BlogCardPost }> = ({ post }) => {
  const { heroImage, meta, populatedAuthors, publishedAt, slug, title } = post

  const heroImageObject = heroImage && typeof heroImage === 'object' ? heroImage : null
  const metaImageObject = meta && meta.image && typeof meta.image === 'object' ? meta.image : null
  const image = heroImageObject || metaImageObject
  const authors = formatAuthors(populatedAuthors || [])
  const href = `/blog/${slug}`

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Link href={href} className="relative block aspect-[3/2] overflow-hidden bg-muted">
        {image && <Media fill imgClassName="object-cover" resource={image} size="33vw" />}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {publishedAt && <time dateTime={publishedAt}>{formatBlogDate(publishedAt)}</time>}
          {authors && <span>{authors}</span>}
        </div>
        <h2 className="text-xl font-semibold leading-snug">
          <Link href={href} className="hover:text-primary">
            {title}
          </Link>
        </h2>
        <div className="mt-auto pt-2">
          <Link
            href={href}
            className="inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Learn more
          </Link>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Create `src/components/BlogArchive/index.tsx`**

```tsx
import React from 'react'

import { BlogCard, type BlogCardPost } from '@/components/BlogCard'

const renderPost = (post: BlogCardPost) => <BlogCard key={post.slug} post={post} />

export const BlogArchive: React.FC<{ posts: BlogCardPost[] }> = ({ posts }) => (
  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">{posts.map(renderPost)}</div>
)
```

- [ ] **Step 3: Create `src/components/CategoryTabs/index.tsx`**

```tsx
import Link from 'next/link'
import React from 'react'

import type { Category } from '@/payload-types'

import { cn } from '@/utilities/ui'

type CategoryTab = {
  href: string
  isActive: boolean
  title: string
}

const toTab =
  (activeSlug?: string) =>
  (category: Category): CategoryTab => ({
    href: `/blog?category=${category.slug}`,
    isActive: category.slug === activeSlug,
    title: category.title,
  })

const renderTab = (tab: CategoryTab) => (
  <Link
    key={tab.href}
    href={tab.href}
    className={cn(
      'rounded-full border px-4 py-1.5 text-sm transition-colors',
      tab.isActive
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border hover:border-primary',
    )}
  >
    {tab.title}
  </Link>
)

export const CategoryTabs: React.FC<{ activeSlug?: string; categories: Category[] }> = ({
  activeSlug,
  categories,
}) => {
  const allTab: CategoryTab = { href: '/blog', isActive: !activeSlug, title: 'All' }
  const tabs = [allTab, ...categories.map(toTab(activeSlug))]

  return <nav className="flex flex-wrap gap-3">{tabs.map(renderTab)}</nav>
}
```

- [ ] **Step 4: Rewrite `src/components/Pagination/index.tsx` with `hrefPattern`**

Keep the existing shadcn subcomponent imports and overall JSX structure; change the component signature and click handlers:

```tsx
'use client'
import {
  Pagination as PaginationComponent,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/utilities/ui'
import { useRouter } from 'next/navigation'
import React from 'react'

const DEFAULT_HREF_PATTERN = '/blog/page/{page}'

export const Pagination: React.FC<{
  className?: string
  hrefPattern?: string
  page: number
  totalPages: number
}> = (props) => {
  const router = useRouter()

  const { className, hrefPattern = DEFAULT_HREF_PATTERN, page, totalPages } = props
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  const hasExtraPrevPages = page - 1 > 1
  const hasExtraNextPages = page + 1 < totalPages

  const hrefFor = (targetPage: number): string =>
    hrefPattern.replace('{page}', String(targetPage))
  const goTo = (targetPage: number) => () => router.push(hrefFor(targetPage))

  return (
    <div className={cn('my-12', className)}>
      <PaginationComponent>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious disabled={!hasPrevPage} onClick={goTo(page - 1)} />
          </PaginationItem>

          {hasExtraPrevPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {hasPrevPage && (
            <PaginationItem>
              <PaginationLink onClick={goTo(page - 1)}>{page - 1}</PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationLink isActive onClick={goTo(page)}>
              {page}
            </PaginationLink>
          </PaginationItem>

          {hasNextPage && (
            <PaginationItem>
              <PaginationLink onClick={goTo(page + 1)}>{page + 1}</PaginationLink>
            </PaginationItem>
          )}

          {hasExtraNextPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext disabled={!hasNextPage} onClick={goTo(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </PaginationComponent>
    </div>
  )
}
```

- [ ] **Step 5: Rewrite `src/app/(frontend)/blog/page.tsx`**

Note: `export const dynamic = 'force-static'` is removed — the page reads `searchParams` now.

```tsx
import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload, type Where } from 'payload'
import React from 'react'

import { BlogArchive } from '@/components/BlogArchive'
import { blogCardSelect } from '@/components/BlogCard'
import { CategoryTabs } from '@/components/CategoryTabs'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import PageClient from './page.client'

export const revalidate = 600

const POSTS_PER_PAGE = 12

type Args = {
  searchParams: Promise<{ category?: string; page?: string }>
}

const byCategorySlug = (slug: string): Where => ({
  'categories.slug': {
    equals: slug,
  },
})

export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { category, page } = await searchParamsPromise
  const currentPage = Number(page || '1')

  if (!Number.isInteger(currentPage) || currentPage < 1) notFound()

  const payload = await getPayload({ config: configPromise })

  const [posts, categories] = await Promise.all([
    payload.find({
      collection: 'posts',
      depth: 1,
      limit: POSTS_PER_PAGE,
      overrideAccess: false,
      page: currentPage,
      select: blogCardSelect,
      sort: '-publishedAt',
      where: category ? byCategorySlug(category) : undefined,
    }),
    payload.find({
      collection: 'categories',
      limit: 100,
      overrideAccess: false,
      pagination: false,
      sort: 'title',
    }),
  ])

  const hrefPattern = category ? `/blog?category=${category}&page={page}` : '/blog/page/{page}'

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-10">
        <h1 className="text-4xl font-bold">Blog</h1>
      </div>

      <div className="container mb-12">
        <CategoryTabs activeSlug={category} categories={categories.docs} />
      </div>

      <div className="container mb-8">
        <PageRange
          collection="posts"
          currentPage={posts.page}
          limit={POSTS_PER_PAGE}
          totalDocs={posts.totalDocs}
        />
      </div>

      <div className="container">
        <BlogArchive posts={posts.docs} />
        {posts.totalPages > 1 && posts.page && (
          <Pagination hrefPattern={hrefPattern} page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Blog',
  }
}
```

- [ ] **Step 6: Rewrite `src/app/(frontend)/blog/page/[pageNumber]/page.tsx`**

```tsx
import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { BlogArchive } from '@/components/BlogArchive'
import { blogCardSelect } from '@/components/BlogCard'
import { CategoryTabs } from '@/components/CategoryTabs'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import PageClient from './page.client'

export const revalidate = 600

const POSTS_PER_PAGE = 12

type Args = {
  params: Promise<{ pageNumber: string }>
}

const toPageParam = (_: unknown, index: number): { pageNumber: string } => ({
  pageNumber: String(index + 1),
})

export default async function Page({ params: paramsPromise }: Args) {
  const { pageNumber } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber) || sanitizedPageNumber < 1) notFound()

  const [posts, categories] = await Promise.all([
    payload.find({
      collection: 'posts',
      depth: 1,
      limit: POSTS_PER_PAGE,
      overrideAccess: false,
      page: sanitizedPageNumber,
      select: blogCardSelect,
      sort: '-publishedAt',
    }),
    payload.find({
      collection: 'categories',
      limit: 100,
      overrideAccess: false,
      pagination: false,
      sort: 'title',
    }),
  ])

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-10">
        <h1 className="text-4xl font-bold">Blog</h1>
      </div>

      <div className="container mb-12">
        <CategoryTabs categories={categories.docs} />
      </div>

      <div className="container mb-8">
        <PageRange
          collection="posts"
          currentPage={posts.page}
          limit={POSTS_PER_PAGE}
          totalDocs={posts.totalDocs}
        />
      </div>

      <div className="container">
        <BlogArchive posts={posts.docs} />
        {posts.totalPages > 1 && posts.page && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  return {
    title: `Blog — Page ${pageNumber || ''}`,
  }
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const { totalDocs } = await payload.count({
    collection: 'posts',
    overrideAccess: false,
  })

  const totalPages = Math.ceil(totalDocs / POSTS_PER_PAGE)

  return Array.from({ length: totalPages }, toPageParam)
}
```

(This also fixes the template's off-by-config bug: `generateStaticParams` divided by 10 while the page size is 12.)

- [ ] **Step 7: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: exit 0. (If `where: undefined` upsets the payload types, omit the key via `...(category ? { where: byCategorySlug(category) } : {})`.)

- [ ] **Step 8: Commit**

```bash
git add src/components/BlogCard src/components/BlogArchive src/components/CategoryTabs src/components/Pagination/index.tsx "src/app/(frontend)/blog/page.tsx" "src/app/(frontend)/blog/page/[pageNumber]/page.tsx"
git commit -m "feat: redesign blog listing with category tabs and card grid"
```

---

### Task 5: Article page — breadcrumbs, meta row, tags, similar posts

**Files:**
- Create: `src/components/Breadcrumbs/index.tsx`, `src/components/TagChips/index.tsx`, `src/components/SimilarPosts/index.tsx`
- Modify (full rewrite of the body): `src/app/(frontend)/blog/[slug]/page.tsx`
- Modify: `src/app/(frontend)/blog/[slug]/page.client.tsx` (header theme `'dark'` → `'light'`)
- Delete: `src/heros/PostHero/` (only consumer was this page — verify with grep first)

**Interfaces:**
- Consumes: `calculateReadTime`, `formatBlogDate` (Task 2); `BlogArchive`, `blogCardSelect` (Task 4).
- Produces: `Breadcrumbs: React.FC<{ crumbs: Crumb[] }>` with `Crumb = { href?: string; label: string }`; `TagChips: React.FC<{ tags: NonNullable<Post['tags']> }>`; `SimilarPosts` async server component `({ post }: { post: Post })`.

- [ ] **Step 1: Create `src/components/Breadcrumbs/index.tsx`**

```tsx
import Link from 'next/link'
import React, { Fragment } from 'react'

export type Crumb = {
  href?: string
  label: string
}

const renderCrumb = (crumb: Crumb, index: number) => (
  <Fragment key={`${crumb.label}-${index}`}>
    {index > 0 && <span className="text-muted-foreground">/</span>}
    {crumb.href ? (
      <Link href={crumb.href} className="text-primary hover:underline">
        {crumb.label}
      </Link>
    ) : (
      <span className="text-muted-foreground">{crumb.label}</span>
    )}
  </Fragment>
)

export const Breadcrumbs: React.FC<{ crumbs: Crumb[] }> = ({ crumbs }) => (
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
    {crumbs.map(renderCrumb)}
  </nav>
)
```

- [ ] **Step 2: Create `src/components/TagChips/index.tsx`**

```tsx
import Link from 'next/link'
import React from 'react'

import type { Post, Tag } from '@/payload-types'

const isTagObject = (tag: Tag | string): tag is Tag => typeof tag === 'object'

const renderChip = (tag: Tag) => (
  <Link
    key={tag.slug}
    href={`/blog/tag/${tag.slug}`}
    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
  >
    {tag.title}
  </Link>
)

export const TagChips: React.FC<{ tags: NonNullable<Post['tags']> }> = ({ tags }) => {
  const tagObjects = tags.filter(isTagObject)

  if (tagObjects.length === 0) return null

  return <div className="flex flex-wrap gap-2">{tagObjects.map(renderChip)}</div>
}
```

- [ ] **Step 3: Create `src/components/SimilarPosts/index.tsx`**

```tsx
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type { Post } from '@/payload-types'

import { BlogArchive } from '@/components/BlogArchive'
import { blogCardSelect, type BlogCardPost } from '@/components/BlogCard'

const isPostObject = (value: Post | string): value is Post => typeof value === 'object'

const getFirstCategoryId = (post: Post): string | null => {
  const categories = post.categories || []
  const first = categories[0]

  if (!first) return null

  return typeof first === 'object' ? String(first.id) : String(first)
}

const fetchSameCategoryPosts = async (post: Post): Promise<BlogCardPost[]> => {
  const categoryId = getFirstCategoryId(post)

  if (!categoryId) return []

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 3,
    overrideAccess: false,
    select: blogCardSelect,
    sort: '-publishedAt',
    where: {
      and: [{ categories: { in: [categoryId] } }, { id: { not_equals: post.id } }],
    },
  })

  return result.docs
}

export const SimilarPosts = async ({ post }: { post: Post }) => {
  const relatedPosts = (post.relatedPosts || []).filter(isPostObject)
  const posts = relatedPosts.length > 0 ? relatedPosts : await fetchSameCategoryPosts(post)

  if (posts.length === 0) return null

  return (
    <section className="container mt-16">
      <h2 className="mb-8 text-2xl font-semibold">Similar Posts</h2>
      <BlogArchive posts={posts} />
    </section>
  )
}
```

- [ ] **Step 4: Rewrite `src/app/(frontend)/blog/[slug]/page.tsx`**

Keep `generateStaticParams`, `generateMetadata`, and `queryPostBySlug` exactly as they are (with the Task 3 `/blog/` url fix). Replace imports and the component body:

```tsx
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import type { Category, Post } from '@/payload-types'

import { Breadcrumbs, type Crumb } from '@/components/Breadcrumbs'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import { SimilarPosts } from '@/components/SimilarPosts'
import { TagChips } from '@/components/TagChips'
import { calculateReadTime } from '@/utilities/readTime'
import { formatBlogDate } from '@/utilities/formatBlogDate'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

// ... generateStaticParams unchanged ...

const isCategoryObject = (category: Category | string): category is Category =>
  typeof category === 'object'

const buildCrumbs = (post: Post): Crumb[] => {
  const categories = (post.categories || []).filter(isCategoryObject)
  const firstCategory = categories[0]
  const categoryCrumbs = firstCategory
    ? [{ href: `/blog?category=${firstCategory.slug}`, label: firstCategory.title }]
    : []

  return [
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    ...categoryCrumbs,
    { label: post.title },
  ]
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = '/blog/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  const readTime = calculateReadTime(post.content)
  const heroImage = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null

  return (
    <article className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <header className="container">
        <div className="mx-auto max-w-[48rem]">
          <Breadcrumbs crumbs={buildCrumbs(post)} />
          <h1 className="mt-6 text-3xl font-bold md:text-5xl">{post.title}</h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            {post.publishedAt && (
              <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
            )}
            <span>{readTime} min read</span>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4">
              <TagChips tags={post.tags} />
            </div>
          )}
          {heroImage && (
            <div className="mt-8 overflow-hidden rounded-lg">
              <Media imgClassName="w-full" priority resource={heroImage} />
            </div>
          )}
        </div>
      </header>

      <div className="container pt-8">
        <RichText className="mx-auto max-w-[48rem]" data={post.content} enableGutter={false} />
      </div>

      <SimilarPosts post={post} />
    </article>
  )
}

// ... generateMetadata and queryPostBySlug unchanged ...
```

- [ ] **Step 5: Header theme + remove PostHero**

5a. In `src/app/(frontend)/blog/[slug]/page.client.tsx` change `setHeaderTheme('dark')` to `setHeaderTheme('light')` (the dark full-bleed hero is gone).

5b. Verify PostHero has no other consumers, then delete it:

```bash
grep -rn "PostHero" src --include="*.ts" --include="*.tsx" | grep -v "heros/PostHero"
# Expected: no output (the page.tsx import was removed in Step 4)
git rm -r src/heros/PostHero
```

- [ ] **Step 6: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: redesign article page with breadcrumbs, read time, tags and similar posts"
```

---

### Task 6: Tag page `/blog/tag/[slug]`

**Files:**
- Create: `src/app/(frontend)/blog/tag/[slug]/page.tsx`

**Interfaces:**
- Consumes: `BlogArchive`, `blogCardSelect`, `Pagination` with `hrefPattern` (Task 4); `tags` collection (Task 1).
- Produces: public route `/blog/tag/[slug]` with `?page=` pagination; unknown tag → 404.

- [ ] **Step 1: Create the page**

```tsx
import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { BlogArchive } from '@/components/BlogArchive'
import { blogCardSelect } from '@/components/BlogCard'
import { Pagination } from '@/components/Pagination'

export const revalidate = 600

const POSTS_PER_PAGE = 12

type Args = {
  params: Promise<{ slug?: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function TagPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const { slug = '' } = await paramsPromise
  const { page } = await searchParamsPromise
  const decodedSlug = decodeURIComponent(slug)
  const currentPage = Number(page || '1')

  if (!Number.isInteger(currentPage) || currentPage < 1) notFound()

  const payload = await getPayload({ config: configPromise })

  const tagResult = await payload.find({
    collection: 'tags',
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: {
        equals: decodedSlug,
      },
    },
  })
  const tag = tagResult.docs[0]

  if (!tag) notFound()

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: POSTS_PER_PAGE,
    overrideAccess: false,
    page: currentPage,
    select: blogCardSelect,
    sort: '-publishedAt',
    where: {
      'tags.slug': {
        equals: decodedSlug,
      },
    },
  })

  return (
    <div className="pt-24 pb-24">
      <div className="container mb-10">
        <p className="mb-2 text-sm text-muted-foreground">
          Posts tagged
        </p>
        <h1 className="text-4xl font-bold">{tag.title}</h1>
      </div>

      <div className="container">
        <BlogArchive posts={posts.docs} />
        {posts.totalPages > 1 && posts.page && (
          <Pagination
            hrefPattern={`/blog/tag/${decodedSlug}?page={page}`}
            page={posts.page}
            totalPages={posts.totalPages}
          />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  return {
    title: `Posts tagged ${decodedSlug} — Blog`,
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(frontend)/blog/tag"
git commit -m "feat: add tag listing page"
```

---

### Task 7: Import script for the three drug-card.io articles

**Files:**
- Create: `scripts/import-blog.ts`
- Modify: `package.json` (add script `"import:blog"`)

**Interfaces:**
- Consumes: `tags`/`categories`/`media`/`posts`/`users` collections; `convertHTMLToLexical`, `editorConfigFactory`, `EXPERIMENTAL_TableFeature` from `@payloadcms/richtext-lexical`; `JSDOM` from `jsdom`; WP REST API (`?slug=<slug>&_embed` returns `content.rendered`, `date_gmt`, `title.rendered`, `yoast_head_json`, `_embedded['wp:term']` (flat groups of `{name, slug, taxonomy}`), `_embedded['wp:featuredmedia'][0].source_url` — all verified live).
- Produces: three published posts (idempotent upsert by slug) with hero image in `media`, categories/tags upserted by slug, `publishedAt` from `date_gmt`, SEO meta from yoast. Exit code 0 on full success, 1 if any article failed.

**Key facts for the implementer:**
- `context: { disableRevalidate: true }` is REQUIRED on post create/update — the `revalidatePost` hook calls `revalidatePath`, which throws outside a Next.js request.
- `editorConfigFactory.fromFeatures` default features already include headings, lists, links, bold/italic/underline; tables need `EXPERIMENTAL_TableFeature()` added explicitly (same feature Task 1 added to the posts editor).
- Media `alt` is optional in this template; media are deduped by `filename`.

- [ ] **Step 1: Write `scripts/import-blog.ts`**

```ts
import config from '@payload-config'
import {
  convertHTMLToLexical,
  editorConfigFactory,
  EXPERIMENTAL_TableFeature,
} from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import { getPayload, type Payload } from 'payload'

import type { Post } from '@/payload-types'

const WP_API_BASE = 'https://drug-card.io/wp-json/wp/v2'

const ARTICLE_SLUGS = [
  'pbrer-vs-psur-key-differences-in-pharmacovigilance-drugcard',
  'pharmacovigilance-automation-transforming-drug-safety-processes-drugcard',
  'what-is-drug-safety-and-pharmacovigilance-explained-drugcard',
]

type EditorConfig = Awaited<ReturnType<typeof editorConfigFactory.fromFeatures>>

type WpTerm = {
  name: string
  slug: string
  taxonomy: string
}

type WpPost = {
  content: { rendered: string }
  date_gmt: string
  slug: string
  title: { rendered: string }
  yoast_head_json?: { description?: string; og_description?: string; title?: string }
  _embedded?: {
    'wp:featuredmedia'?: Array<{ alt_text?: string; source_url?: string }>
    'wp:term'?: WpTerm[][]
  }
}

const fetchWpPost = async (slug: string): Promise<WpPost> => {
  const response = await fetch(`${WP_API_BASE}/posts?slug=${slug}&_embed`)

  if (!response.ok) throw new Error(`WP API request failed for "${slug}": ${response.status}`)

  const posts = (await response.json()) as WpPost[]

  if (posts.length === 0) throw new Error(`No WP post found for slug "${slug}"`)

  return posts[0]
}

const decodeEntities = (value: string): string => {
  const fragment = JSDOM.fragment(`<span>${value}</span>`)
  return fragment.textContent || value
}

const unwrapTableFigure = (figure: Element): void => {
  const table = figure.querySelector('table')
  if (table) figure.replaceWith(table)
}

const cleanContentHtml = (html: string): string => {
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`)
  const body = dom.window.document.body

  Array.from(body.querySelectorAll('figure')).forEach(unwrapTableFigure)

  return body.innerHTML
}

const extractTerms = (wpPost: WpPost): WpTerm[] => {
  const groups = (wpPost._embedded && wpPost._embedded['wp:term']) || []
  return groups.flat()
}

const isCategoryTerm = (term: WpTerm): boolean => term.taxonomy === 'category'
const isTagTerm = (term: WpTerm): boolean => term.taxonomy === 'post_tag'

const upsertTerm = async (
  payload: Payload,
  collection: 'categories' | 'tags',
  term: WpTerm,
): Promise<string> => {
  const existing = await payload.find({
    collection,
    limit: 1,
    pagination: false,
    where: { slug: { equals: term.slug } },
  })
  const found = existing.docs[0]

  if (found) return String(found.id)

  const created = await payload.create({
    collection,
    data: { slug: term.slug, title: term.name },
  })

  return String(created.id)
}

const upsertCategory = (payload: Payload) => (term: WpTerm) =>
  upsertTerm(payload, 'categories', term)
const upsertTag = (payload: Payload) => (term: WpTerm) => upsertTerm(payload, 'tags', term)

const upsertMediaFromUrl = async (
  payload: Payload,
  url: string,
  alt: string,
): Promise<string> => {
  const pathSegments = new URL(url).pathname.split('/').filter(Boolean)
  const filename = pathSegments[pathSegments.length - 1] || 'image.jpg'

  const existing = await payload.find({
    collection: 'media',
    limit: 1,
    pagination: false,
    where: { filename: { equals: filename } },
  })
  const found = existing.docs[0]

  if (found) return String(found.id)

  const response = await fetch(url)

  if (!response.ok) throw new Error(`Image download failed for ${url}: ${response.status}`)

  const data = Buffer.from(await response.arrayBuffer())
  const mimetype = response.headers.get('content-type') || 'image/jpeg'

  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype, name: filename, size: data.byteLength },
  })

  return String(created.id)
}

const importArticle = async (
  payload: Payload,
  editorConfig: EditorConfig,
  authorIds: string[],
  slug: string,
): Promise<string> => {
  const wpPost = await fetchWpPost(slug)
  const terms = extractTerms(wpPost)
  const title = decodeEntities(wpPost.title.rendered)

  const categoryIds = await Promise.all(terms.filter(isCategoryTerm).map(upsertCategory(payload)))
  const tagIds = await Promise.all(terms.filter(isTagTerm).map(upsertTag(payload)))

  const featuredMedia = wpPost._embedded && wpPost._embedded['wp:featuredmedia']
  const imageUrl = featuredMedia && featuredMedia[0] ? featuredMedia[0].source_url : null
  const imageAlt = (featuredMedia && featuredMedia[0] && featuredMedia[0].alt_text) || title
  const heroImageId = imageUrl ? await upsertMediaFromUrl(payload, imageUrl, imageAlt) : null

  const content = convertHTMLToLexical({
    editorConfig,
    html: cleanContentHtml(wpPost.content.rendered),
    JSDOM,
  }) as unknown as Post['content']

  const yoast = wpPost.yoast_head_json || {}

  const data = {
    title,
    slug: wpPost.slug,
    content,
    _status: 'published' as const,
    authors: authorIds,
    categories: categoryIds,
    tags: tagIds,
    heroImage: heroImageId,
    publishedAt: new Date(`${wpPost.date_gmt}Z`).toISOString(),
    meta: {
      description: yoast.description || yoast.og_description || '',
      image: heroImageId,
      title: yoast.title || title,
    },
  }

  const existing = await payload.find({
    collection: 'posts',
    draft: true,
    limit: 1,
    pagination: false,
    where: { slug: { equals: wpPost.slug } },
  })
  const found = existing.docs[0]

  if (found) {
    await payload.update({
      collection: 'posts',
      id: found.id,
      data,
      context: { disableRevalidate: true },
    })
    return `updated: ${wpPost.slug}`
  }

  await payload.create({
    collection: 'posts',
    data,
    context: { disableRevalidate: true },
  })

  return `created: ${wpPost.slug}`
}

const importArticleWith =
  (payload: Payload, editorConfig: EditorConfig, authorIds: string[]) => (slug: string) =>
    importArticle(payload, editorConfig, authorIds, slug)

const isRejected = (result: PromiseSettledResult<string>): result is PromiseRejectedResult =>
  result.status === 'rejected'

const logResult = (result: PromiseSettledResult<string>): void => {
  if (result.status === 'fulfilled') {
    console.log(result.value)
    return
  }
  console.error('FAILED:', result.reason)
}

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })

  const editorConfig = await editorConfigFactory.fromFeatures({
    config: payload.config,
    features: ({ defaultFeatures }) => [...defaultFeatures, EXPERIMENTAL_TableFeature()],
  })

  const users = await payload.find({ collection: 'users', limit: 1, pagination: false })
  const firstUser = users.docs[0]
  const authorIds = firstUser ? [String(firstUser.id)] : []

  const results = await Promise.allSettled(
    ARTICLE_SLUGS.map(importArticleWith(payload, editorConfig, authorIds)),
  )

  results.forEach(logResult)

  const failures = results.filter(isRejected)
  process.exit(failures.length > 0 ? 1 : 0)
}

run()
```

- [ ] **Step 2: Add the npm script to `package.json`**

In `"scripts"`, after `"ii"`:

```json
"import:blog": "cross-env NODE_OPTIONS=--no-deprecation payload run scripts/import-blog.ts",
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: exit 0. (If tsc complains that `scripts/` is outside `include`, check `tsconfig.json` — add `"scripts/**/*.ts"` to `include` if needed.)

- [ ] **Step 4: Run the import (requires MongoDB running per `.env`)**

Run: `pnpm import:blog`
Expected output: three `created: <slug>` lines, exit 0.

- [ ] **Step 5: Verify idempotency**

Run: `pnpm import:blog` again.
Expected: three `updated: <slug>` lines, exit 0 — no duplicate posts/media/terms (verify quickly: the log shows `updated`, not `created`).

- [ ] **Step 6: Commit**

```bash
git add scripts/import-blog.ts package.json
git commit -m "feat: add drug-card.io article import script"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full test + lint + typecheck sweep**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:int`
Expected: all pass.

- [ ] **Step 2: Boot the dev server and probe every new page**

```bash
pnpm dev   # run in background, wait for "Ready"
curl -s http://localhost:3000/blog | grep -o "Learn more" | head -1        # expect: Learn more
curl -s http://localhost:3000/blog | grep -o "PBRER vs PSUR[^<]*" | head -1 # expect: article title
curl -s "http://localhost:3000/blog?category=pharmacovigilance" | grep -c "Learn more"  # expect: ≥ 1
curl -s http://localhost:3000/blog/pbrer-vs-psur-key-differences-in-pharmacovigilance-drugcard | grep -o "min read"     # expect: min read
curl -s http://localhost:3000/blog/pbrer-vs-psur-key-differences-in-pharmacovigilance-drugcard | grep -o "<table" | head -1  # expect: <table (comparison table converted + rendered)
curl -s http://localhost:3000/blog/pbrer-vs-psur-key-differences-in-pharmacovigilance-drugcard | grep -o "Similar Posts"     # expect: Similar Posts
curl -s http://localhost:3000/blog/tag/psur | grep -o "PSUR" | head -1     # expect: PSUR
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/blog/tag/nonexistent  # expect: 404
```

If the `<table` probe fails: the JSX converter lacks a table converter — check `RichText` default converters and, if needed, verify table nodes exist in the stored content (`convertHTMLToLexical` output) before touching the renderer.

- [ ] **Step 3: Visual check**

Open `http://localhost:3000/blog` and one article in a browser (or Puppeteer screenshot): grid 3/2/1 columns, card order image → date+author → title → button; article shows breadcrumbs, date + read time, tag chips, table styling, Similar Posts.

- [ ] **Step 4: Check the Header nav global**

The header nav items live in the DB (Header global). If a nav item points to `/posts`, update it in the admin panel (`/admin/globals/header`) to `/blog`. Note this for the user if the DB is empty.

- [ ] **Step 5: Final commit (if verification produced fixes)**

```bash
git add -A
git commit -m "fix: address issues found during blog verification"
```

---

## Self-Review Notes

- Spec coverage: taxonomy (Task 1), routes + redirect targets (Task 3), listing grid + tabs + pagination (Task 4), article page incl. CTA-in-content (Task 1 editor + existing RichText `cta` converter, Task 5 page), tag page (Task 6), import (Task 7), error handling (unknown category → empty grid via query, unknown tag → 404 in Task 6, per-article `allSettled` isolation in Task 7), testing (Tasks 2 and 8). ✓
- The original's mid-article CTA needs no new renderer: `src/components/RichText/index.tsx` already converts the `cta` block; Task 1 only exposes it in the posts editor.
- Type consistency: `blogCardSelect`/`BlogCardPost` defined once in Task 4 and imported everywhere; `hrefPattern` `{page}` placeholder used by Tasks 4 and 6; `calculateReadTime(content: Post['content'])` matches call in Task 5.
