import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { CaseStudy } from '../../../payload-types'

// Routes live under the [locale] segment (/en/case-studies, /uk/case-study/x),
// so revalidate by the route pattern with type 'page' — an unprefixed literal
// path would miss every locale-prefixed cached page.
const revalidateCaseStudiesListing = () => {
  revalidatePath('/[locale]/case-studies', 'page')
}

const revalidateCaseStudyItem = (slug?: string | null) => {
  if (!slug) return

  revalidatePath('/[locale]/case-study/[slug]', 'page')
  revalidateCaseStudiesListing()
  revalidateTag('case-studies-sitemap', 'max')
}

export const revalidateCaseStudies: CollectionAfterChangeHook<CaseStudy> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  if (doc._status === 'published') {
    payload.logger.info(`Revalidating case study at path: /case-study/${doc.slug}`)
    revalidateCaseStudyItem(doc.slug)
  }

  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    revalidateCaseStudyItem(previousDoc.slug)
  }

  return doc
}

export const revalidateCaseStudiesDelete: CollectionAfterDeleteHook<CaseStudy> = ({
  doc,
  req: { context },
}) => {
  if (context.disableRevalidate) return doc

  revalidateCaseStudyItem(doc?.slug)

  return doc
}
