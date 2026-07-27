import type { Metadata } from 'next'

import type { AppLocale } from '@/i18n/routing'
import type { PageContent } from '@/payload-types'

import { buildLocaleAlternates, localizedUrl } from '@/utilities/buildLocaleAlternates'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

type MetaFallback = {
  title: string
  description: string
}

type PageLocation = {
  locale: AppLocale
  path: string
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
//
// Every hand-coded page goes through here so none of them can ship without a
// full Open Graph block: a page that sets only `title` and `description`
// inherits the layout's generic og:title ("DrugCard") and no og:image at all,
// which is what turned shared links into a bare text row.
export const buildPageMetadata = (
  content: PageContent | null,
  fallback: MetaFallback,
  location: PageLocation,
): Metadata => {
  const meta = content && content.meta ? content.meta : null
  const title = meta && meta.title ? meta.title : fallback.title
  const description = meta && meta.description ? meta.description : fallback.description
  const imageUrl = meta ? resolveImageUrl(meta.image) : undefined
  // Undefined rather than an empty array, so mergeOpenGraph can drop in the
  // site-wide banner.
  const images = imageUrl ? [{ url: imageUrl }] : undefined

  return {
    title,
    description,
    alternates: buildLocaleAlternates(location.locale, location.path),
    openGraph: mergeOpenGraph({
      description,
      images,
      title,
      url: localizedUrl(location.locale, location.path),
    }),
  }
}
