import type { Metadata } from 'next'

import type { AppLocale } from '@/i18n/routing'
import type { Media, News, Post, CaseStudy, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { buildLocaleAlternates, localizedUrl } from './buildLocaleAlternates'
import { getServerSideURL } from './getURL'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

const BRAND = 'DrugCard'

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
  const title = contentTitle ? `${contentTitle} | ${BRAND}` : BRAND

  const path = url || '/'

  return {
    description: doc?.meta?.description,
    alternates: buildLocaleAlternates(locale, path),
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
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
