import type { NextConfig } from 'next'

// The old (pre-localization) site exposed content without a locale prefix
// (/blog/..., /news/...) and Google still holds those URLs. next-intl's
// middleware would redirect them with a temporary 307; these explicit
// permanent redirects run before the middleware so search engines transfer
// ranking to the /en/... URLs. Root "/" is intentionally left to the
// middleware to keep browser-language locale detection on the homepage.
const LEGACY_UNPREFIXED_SOURCES = [
  '/blog/:path*',
  '/news/:path*',
  '/case-studies/:path*',
  '/case-study/:path*',
]

const toDefaultLocaleRedirect = (source: string) => ({
  source,
  destination: `/en${source}`,
  permanent: true,
})

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  const legacyUnprefixedRedirects = LEGACY_UNPREFIXED_SOURCES.map(toDefaultLocaleRedirect)

  return [internetExplorerRedirect, ...legacyUnprefixedRedirects]
}
