import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

// Primitive argument keeps React cache() memoization working across
// the page render and generateMetadata — one DB hit per request.
export const fetchTagBySlug = cache(async (slug: string) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'tags',
    limit: 1,
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
