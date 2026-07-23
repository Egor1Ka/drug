import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Author } from '../../../payload-types'

const revalidateAuthorPath = (slug?: string | null) => {
  if (!slug) return

  revalidatePath(`/blog/author/${slug}`)
  revalidateTag('authors-sitemap', 'max')
}

export const revalidateAuthor: CollectionAfterChangeHook<Author> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  payload.logger.info(`Revalidating author at path: /blog/author/${doc.slug}`)
  revalidateAuthorPath(doc.slug)

  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    revalidateAuthorPath(previousDoc.slug)
  }

  return doc
}

export const revalidateAuthorDelete: CollectionAfterDeleteHook<Author> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  revalidateAuthorPath(doc?.slug)

  return doc
}
