import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post } from '../../../payload-types'

// Routes live under /[locale]/... — revalidating by the route PATTERN clears
// every locale and every slug at once; an unprefixed literal ("/blog/x")
// matches nothing and silently leaves stale pages cached.
const revalidateBlogPages = () => {
  revalidatePath('/[locale]/blog', 'page')
  revalidatePath('/[locale]/blog/[slug]', 'page')
  revalidatePath('/[locale]/blog/page/[pageNumber]', 'page')
  revalidatePath('/[locale]/blog/tag/[slug]', 'page')
  revalidatePath('/[locale]/blog/author/[slug]', 'page')
  revalidateTag('posts-sitemap', 'max')
}

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  const wasPublished = previousDoc?._status === 'published'
  const isPublished = doc._status === 'published'

  if (isPublished || wasPublished) {
    payload.logger.info(`Revalidating blog pages after change of post "${doc.slug}"`)
    revalidateBlogPages()
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({ doc, req: { context } }) => {
  if (context.disableRevalidate) return doc

  revalidateBlogPages()

  return doc
}
