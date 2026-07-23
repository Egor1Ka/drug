import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'
import { cache } from 'react'

// Primitive arguments keep React cache() memoization working across
// the page render and generateMetadata — one DB hit per request.
export const fetchAuthorBySlug = cache(async (slug: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'authors',
    limit: 1,
    locale,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] || null
})

export const fetchAllAuthorSlugs = async () => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'authors',
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
      updatedAt: true,
    },
  })

  return result.docs
}
