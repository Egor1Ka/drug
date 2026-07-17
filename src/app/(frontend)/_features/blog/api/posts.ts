import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'

import type { Post } from '@/payload-types'

export const POSTS_PER_PAGE = 12

// Field set every blog card renders — single source for all listing queries.
export const blogCardSelect = {
  authors: true,
  categories: true,
  heroImage: true,
  meta: true,
  publishedAt: true,
  slug: true,
  title: true,
} as const

const byCategorySlug = (slug: string): Where => ({
  'categories.slug': {
    equals: slug,
  },
})

type PublishedPostsPageArgs = {
  category?: string
  page: number
}

export const fetchPublishedPostsPage = async ({ category, page }: PublishedPostsPageArgs) => {
  const payload = await getPayload({ config: configPromise })

  return payload.find({
    collection: 'posts',
    depth: 1,
    limit: POSTS_PER_PAGE,
    overrideAccess: false,
    page,
    select: blogCardSelect,
    sort: '-publishedAt',
    where: category ? byCategorySlug(category) : undefined,
  })
}

type PostsByTagArgs = {
  page: number
  slug: string
}

export const fetchPostsByTag = async ({ page, slug }: PostsByTagArgs) => {
  const payload = await getPayload({ config: configPromise })

  return payload.find({
    collection: 'posts',
    depth: 1,
    limit: POSTS_PER_PAGE,
    overrideAccess: false,
    page,
    select: blogCardSelect,
    sort: '-publishedAt',
    where: {
      'tags.slug': {
        equals: slug,
      },
    },
  })
}

// Primitive argument keeps React cache() memoization working across
// the page render and generateMetadata — one DB hit per request.
export const fetchPostBySlug = cache(async (slug: string) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
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

export const fetchAllPostSlugs = async () => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
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

export const fetchPublishedPostsCount = async () => {
  const payload = await getPayload({ config: configPromise })

  const { totalDocs } = await payload.count({
    collection: 'posts',
    overrideAccess: false,
  })

  return totalDocs
}

const isPostObject = (value: Post | string): value is Post => typeof value === 'object'

const getFirstCategoryId = (post: Post): string | null => {
  const categories = post.categories || []
  const first = categories[0]

  if (!first) return null

  return typeof first === 'object' ? String(first.id) : String(first)
}

const fetchSameCategoryPosts = async (post: Post) => {
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

export const fetchSimilarPosts = async (post: Post) => {
  const relatedPosts = (post.relatedPosts || []).filter(isPostObject)

  if (relatedPosts.length > 0) return relatedPosts

  return fetchSameCategoryPosts(post)
}
