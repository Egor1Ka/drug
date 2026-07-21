import type { Metadata } from 'next'

import type { PageContent } from '@/payload-types'

import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

type MetaFallback = {
  title: string
  description: string
}

type PageMeta = NonNullable<PageContent['meta']>

const resolveImageUrl = (image: PageMeta['image']): string | undefined => {
  if (!image || typeof image !== 'object') return undefined

  const media = image
  const ogUrl = media.sizes && media.sizes.og ? media.sizes.og.url : undefined
  const relativeUrl = ogUrl || media.url

  if (!relativeUrl) return undefined

  return `${getServerSideURL()}${relativeUrl}`
}

// Source of truth for hand-coded page SEO is the CMS `meta` group; any field
// left empty falls back to the page's i18n values so nothing regresses before
// editors fill it in.
export const buildPageMetadata = (
  content: PageContent | null,
  fallback: MetaFallback,
): Metadata => {
  const meta = content && content.meta ? content.meta : null
  const title = meta && meta.title ? meta.title : fallback.title
  const description = meta && meta.description ? meta.description : fallback.description
  const imageUrl = meta ? resolveImageUrl(meta.image) : undefined
  const images = imageUrl ? [{ url: imageUrl }] : undefined

  return {
    title,
    description,
    openGraph: mergeOpenGraph({ title, description, images }),
  }
}
