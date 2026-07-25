import type { ISitemapField } from 'next-sitemap'

import type { AppLocale } from '@/i18n/routing'
import { routing } from '@/i18n/routing'

type SitemapAlternateRef = { href: string; hreflang: string }

const toAlternateRef =
  (siteUrl: string, path: string) =>
  (locale: AppLocale): SitemapAlternateRef => ({
    href: `${siteUrl}/${locale}${path}`,
    hreflang: locale,
  })

// One sitemap entry per document (not per locale): loc points at the default
// locale, alternateRefs carry the hreflang set including x-default.
export const buildLocalizedSitemapEntry = (
  siteUrl: string,
  path: string,
  lastmod: string,
): ISitemapField => {
  const defaultLocaleUrl = `${siteUrl}/${routing.defaultLocale}${path}`
  const localeRefs = routing.locales.map(toAlternateRef(siteUrl, path))

  return {
    loc: defaultLocaleUrl,
    lastmod,
    alternateRefs: [...localeRefs, { href: defaultLocaleUrl, hreflang: 'x-default' }],
  }
}
