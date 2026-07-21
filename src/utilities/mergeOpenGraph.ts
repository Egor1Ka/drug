import type { Metadata } from 'next'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'DrugCard - AI-powered pharmacovigilance tools & services for automated literature monitoring, regulatory intelligence and adverse events management.',
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
