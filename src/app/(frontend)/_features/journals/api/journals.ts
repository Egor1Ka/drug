import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'

// Three countries today, a handful tomorrow — the original has no pagination
// either, so one query returns the whole listing.
export const JOURNALS_LIMIT = 100

// Field set every journal card renders — single source for listing queries.
export const JOURNAL_CARD_SELECT = {
  title: true,
  slug: true,
  country: true,
  coverImage: true,
  file: true,
  order: true,
} as const

type PublishedJournalsArgs = {
  locale: TypedLocale
}

export const fetchPublishedJournals = async ({ locale }: PublishedJournalsArgs) => {
  const payload = await getPayload({ config: configPromise })

  return payload.find({
    collection: 'journals',
    depth: 1,
    limit: JOURNALS_LIMIT,
    locale,
    overrideAccess: false,
    pagination: false,
    select: JOURNAL_CARD_SELECT,
    sort: 'order',
  })
}
