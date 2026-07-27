import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'

// A curated shelf, not a feed: ten documents today and no pagination on the
// original either, so one query returns the whole listing.
export const DOCUMENTS_LIMIT = 100

// Field set every document card renders — single source for listing queries.
export const DOCUMENT_CARD_SELECT = {
  title: true,
  slug: true,
  description: true,
  coverImage: true,
  file: true,
  order: true,
} as const

type PublishedDocumentsArgs = {
  locale: TypedLocale
}

export const fetchPublishedDocuments = async ({ locale }: PublishedDocumentsArgs) => {
  const payload = await getPayload({ config: configPromise })

  return payload.find({
    collection: 'documents',
    depth: 1,
    limit: DOCUMENTS_LIMIT,
    locale,
    overrideAccess: false,
    pagination: false,
    select: DOCUMENT_CARD_SELECT,
    sort: 'order',
  })
}
