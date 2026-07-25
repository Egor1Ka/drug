import type { Metadata } from 'next'

import type { AppLocale } from '@/i18n/routing'
import { routing } from '@/i18n/routing'

import { getServerSideURL } from './getURL'

// Slugs are shared across locales (decision: no localized slugs), so every
// page exists at the same path under each locale prefix and alternates are a
// pure prefix swap: "/blog/my-post" → "/en/blog/my-post", "/uk/blog/my-post".
export const localizedUrl = (locale: AppLocale, path: string): string => {
  const serverUrl = getServerSideURL()
  const pathWithoutTrailingRoot = path === '/' ? '' : path

  return `${serverUrl}/${locale}${pathWithoutTrailingRoot}`
}

const addLanguageUrl =
  (path: string) =>
  (languages: Record<string, string>, locale: AppLocale): Record<string, string> => ({
    ...languages,
    [locale]: localizedUrl(locale, path),
  })

export const buildLocaleAlternates = (
  locale: AppLocale,
  path: string,
): NonNullable<Metadata['alternates']> => {
  const languages = routing.locales.reduce(addLanguageUrl(path), {})

  return {
    canonical: localizedUrl(locale, path),
    languages: {
      ...languages,
      'x-default': localizedUrl(routing.defaultLocale, path),
    },
  }
}
