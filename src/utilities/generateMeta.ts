import type { Metadata } from 'next'

import type { AppLocale } from '@/i18n/routing'
import type { Media, News, Post, CaseStudy, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { buildLocaleAlternates, localizedUrl } from './buildLocaleAlternates'
import { getServerSideURL } from './getURL'

// Returns null when the document carries no artwork of its own, so
// mergeOpenGraph can fall back to the site-wide banner instead of pointing at
// an image that does not exist.
const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  if (!image || typeof image !== 'object' || !('url' in image)) return null

  const serverUrl = getServerSideURL()
  const ogUrl = image.sizes?.og?.url

  return ogUrl ? serverUrl + ogUrl : serverUrl + image.url
}

const BRAND = 'DrugCard'

// Most SEO titles were imported from the original site, where the brand is
// already baked into the string ("… — DrugCard"). Appending it again produced
// "… — DrugCard | DrugCard" on 186 of 194 posts.
const withBrand = (title: string) =>
  title.toLowerCase().includes(BRAND.toLowerCase()) ? title : `${title} | ${BRAND}`

export const generateMeta = async (args: {
  doc: Partial<Post> | Partial<News> | Partial<CaseStudy> | null
  locale: AppLocale
  url?: string
}): Promise<Metadata> => {
  const { doc, locale, url } = args

  const ogImage = getImageURL(doc?.meta?.image)

  // Prefer the editor-set SEO title, fall back to the document's own title,
  // and only then to the bare brand — never leave a page titled just "DrugCard"
  // when it has a real heading.
  const contentTitle = doc?.meta?.title || (typeof doc?.title === 'string' ? doc.title : undefined)
  const title = contentTitle ? withBrand(contentTitle) : BRAND

  const path = url || '/'

  // Undefined rather than an empty string: an empty value would win the
  // spread inside mergeOpenGraph and leave the page with no og:description
  // instead of the site-wide one.
  const description = doc?.meta?.description || undefined

  return {
    description,
    alternates: buildLocaleAlternates(locale, path),
    openGraph: mergeOpenGraph({
      description,
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: localizedUrl(locale, path),
    }),
    title,
  }
}
