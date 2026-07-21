import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import { routing } from '@/i18n/routing'
import { pageKeyToPath } from '@/utilities/pageKeyToPath'

import type { PageContent } from '../../../payload-types'

const revalidatePageForAllLocales = (pageKey: string) => {
  const toLocalizedPath = (locale: string) => `/${locale}${pageKeyToPath(pageKey)}`
  const revalidateLocalizedPath = (path: string) => revalidatePath(path)

  routing.locales.map(toLocalizedPath).forEach(revalidateLocalizedPath)
}

export const revalidatePageContent: CollectionAfterChangeHook<PageContent> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  payload.logger.info(`Revalidating page content: ${doc.pageKey}`)
  revalidatePageForAllLocales(doc.pageKey)

  // A renamed pageKey leaves the old route serving stale content
  if (previousDoc && previousDoc.pageKey && previousDoc.pageKey !== doc.pageKey) {
    revalidatePageForAllLocales(previousDoc.pageKey)
  }

  return doc
}

export const revalidatePageContentDelete: CollectionAfterDeleteHook<PageContent> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  if (doc && doc.pageKey) {
    revalidatePageForAllLocales(doc.pageKey)
  }

  return doc
}
