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
