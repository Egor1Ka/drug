import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'
import { cache } from 'react'

// Primitive arguments keep React cache() memoization working across
// the page render and generateMetadata — one DB hit per request.
export const fetchFormBySlug = cache(async (slug: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'forms',
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

  return result.docs?.[0] || null
})
