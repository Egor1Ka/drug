import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Document } from '../../../payload-types'

// The listing lives under the [locale] segment (/en/documents, /uk/documents),
// so revalidate by the route pattern with type 'page' — an unprefixed literal
// path would miss every locale-prefixed cached page. There is no per-document
// route to purge: the whole section is a single listing.
const revalidateDocumentsListing = () => {
  revalidatePath('/[locale]/documents', 'page')
}

export const revalidateDocuments: CollectionAfterChangeHook<Document> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  const wasPublished = previousDoc?._status === 'published'
  const isPublished = doc._status === 'published'

  if (isPublished || wasPublished) {
    payload.logger.info(`Revalidating documents listing after change to: ${doc.slug}`)
    revalidateDocumentsListing()
  }

  return doc
}

export const revalidateDocumentsDelete: CollectionAfterDeleteHook<Document> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  revalidateDocumentsListing()

  return doc
}
