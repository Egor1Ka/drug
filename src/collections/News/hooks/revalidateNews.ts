import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { News } from '../../../payload-types'

// Routes live under the [locale] segment (/en/news, /uk/news/x), so revalidate
// by the route pattern with type 'page' — an unprefixed literal path would miss
// every locale-prefixed cached page.
const revalidateNewsListing = () => {
  revalidatePath('/[locale]/news', 'page')
  revalidatePath('/[locale]/news/page/[pageNumber]', 'page')
}

const revalidateNewsItem = (slug?: string | null) => {
  if (!slug) return

  revalidatePath('/[locale]/news/[slug]', 'page')
  revalidateNewsListing()
  revalidateTag('news-sitemap', 'max')
}

export const revalidateNews: CollectionAfterChangeHook<News> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  if (doc._status === 'published') {
    payload.logger.info(`Revalidating news at path: /news/${doc.slug}`)
    revalidateNewsItem(doc.slug)
  }

  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    revalidateNewsItem(previousDoc.slug)
  }

  return doc
}

export const revalidateNewsDelete: CollectionAfterDeleteHook<News> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  revalidateNewsItem(doc?.slug)

  return doc
}
