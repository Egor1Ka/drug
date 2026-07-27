import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Journal } from '../../../payload-types'

// The listing lives under the [locale] segment (/en/local-medical-journals),
// so revalidate by the route pattern with type 'page' — an unprefixed literal
// path would miss every locale-prefixed cached page. There is no per-journal
// route to purge: the whole section is a single listing.
const revalidateJournalsListing = () => {
  revalidatePath('/[locale]/local-medical-journals', 'page')
}

export const revalidateJournals: CollectionAfterChangeHook<Journal> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  const wasPublished = previousDoc?._status === 'published'
  const isPublished = doc._status === 'published'

  if (isPublished || wasPublished) {
    payload.logger.info(`Revalidating journals listing after change to: ${doc.slug}`)
    revalidateJournalsListing()
  }

  return doc
}

export const revalidateJournalsDelete: CollectionAfterDeleteHook<Journal> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  revalidateJournalsListing()

  return doc
}
