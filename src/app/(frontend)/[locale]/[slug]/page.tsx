import { PayloadRedirects } from '@/components/PayloadRedirects'
import { setRequestLocale } from 'next-intl/server'

import type { AppLocale } from '@/i18n/routing'

type Args = {
  params: Promise<{ locale: AppLocale; slug?: string }>
}

// Catch-all fallback: any path not served by a hand-coded route resolves a CMS
// redirect if one exists, otherwise 404s. Hand-coded routes take precedence over
// this dynamic segment, so it only ever handles unmatched paths.
export default async function CatchAllRedirect({ params }: Args) {
  const { locale, slug } = await params

  setRequestLocale(locale)

  const url = '/' + (slug ? decodeURIComponent(slug) : '')

  return <PayloadRedirects url={url} />
}
