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
