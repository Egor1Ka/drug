import type { Metadata } from 'next/types'

import { setRequestLocale } from 'next-intl/server'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { Show } from '@frontend/_shared/ui/Show'
import { NewsArchive, NewsListingLayout, fetchPublishedNewsPage } from '@frontend/_features/news'

export const revalidate = 600

type Args = {
  params: Promise<{ locale: AppLocale }>
}

export default async function NewsListingPage({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise

  setRequestLocale(locale)

  const news = await fetchPublishedNewsPage({ locale, page: 1 })

  return (
    <NewsListingLayout>
      <NewsListingLayout.Header>
        <h1 className="text-4xl font-bold">News &amp; Updates</h1>
        <p className="mt-3 text-muted-foreground">
          Product releases, industry events, and insights from the world of pharmacovigilance.
        </p>
      </NewsListingLayout.Header>

      <NewsListingLayout.Content>
        <Show when={news.docs.length > 0}>
          <NewsArchive items={news.docs} />
        </Show>
      </NewsListingLayout.Content>
    </NewsListingLayout>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  await params

  return {
    title: 'News & Updates',
    description:
      'Product releases, industry events, and insights from the world of pharmacovigilance.',
  }
}
