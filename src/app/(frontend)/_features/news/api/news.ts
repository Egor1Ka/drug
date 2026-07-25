import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { getPayload, type TypedLocale } from 'payload'
import { cache } from 'react'

export const NEWS_PER_PAGE = 12

// Field set every news card renders — single source for all listing queries.
export const newsCardSelect = {
  title: true,
  slug: true,
  excerpt: true,
  publishedAt: true,
  meta: true,
} as const

type PublishedNewsPageArgs = {
  locale: TypedLocale
  page: number
}

export const fetchPublishedNewsPage = async ({ locale, page }: PublishedNewsPageArgs) => {
  const payload = await getPayload({ config: configPromise })

  return payload.find({
    collection: 'news',
    depth: 1,
    limit: NEWS_PER_PAGE,
    locale,
    overrideAccess: false,
    page,
    select: newsCardSelect,
    sort: '-publishedAt',
  })
}

// Primitive arguments keep React cache() memoization working across
// the page render and generateMetadata — one DB hit per request.
export const fetchNewsBySlug = cache(async (slug: string, locale: TypedLocale) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'news',
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

export type AdjacentNewsLink = { slug: string; title: string }

const adjacentSelect = { title: true, slug: true } as const

const toAdjacentLink = (doc?: {
  slug?: string | null
  title?: string | null
}): AdjacentNewsLink | null => {
  if (!doc || !doc.slug || !doc.title) return null
  return { slug: doc.slug, title: doc.title }
}

// Prev/next links for the detail page: "previous" is the next-older item,
// "next" the next-newer one, both by publishedAt (mirrors the original site).
export const fetchAdjacentNews = cache(async (publishedAt: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })

  const [older, newer] = await Promise.all([
    payload.find({
      collection: 'news',
      depth: 0,
      limit: 1,
      locale,
      overrideAccess: false,
      pagination: false,
      select: adjacentSelect,
      sort: '-publishedAt',
      where: { publishedAt: { less_than: publishedAt } },
    }),
    payload.find({
      collection: 'news',
      depth: 0,
      limit: 1,
      locale,
      overrideAccess: false,
      pagination: false,
      select: adjacentSelect,
      sort: 'publishedAt',
      where: { publishedAt: { greater_than: publishedAt } },
    }),
  ])

  return {
    previous: toAdjacentLink(older.docs[0]),
    next: toAdjacentLink(newer.docs[0]),
  }
})

export const fetchAllNewsSlugs = async () => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'news',
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
