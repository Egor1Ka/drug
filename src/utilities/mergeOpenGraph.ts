import type { Metadata } from 'next'

// Site-wide fallback share image, taken from the original site. Every page
// must ship an og:image — without one Telegram, Slack and LinkedIn render a
// bare text row instead of a card — so this is the floor, and pages with their
// own artwork override it. The dimensions are declared because several
// scrapers only switch to the large-card layout when they are present.
export const DEFAULT_OG_IMAGE = {
  alt: 'DrugCard — automated pharmacovigilance literature screening',
  height: 627,
  url: '/og-default.png',
  width: 1200,
}

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'DrugCard - AI-powered pharmacovigilance tools & services for automated literature monitoring, regulatory intelligence and adverse events management.',
  images: [DEFAULT_OG_IMAGE],
  siteName: 'DrugCard',
  title: 'DrugCard',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
