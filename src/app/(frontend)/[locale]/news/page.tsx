import type { Metadata } from 'next/types'

import { setRequestLocale } from 'next-intl/server'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { Show } from '@frontend/_shared/ui/Show'
import { NewsArchive, NewsListingLayout, fetchPublishedNewsPage } from '@frontend/_features/news'
import { buildPageMetadata, fetchPageContent } from '@frontend/_features/page-content'

export const revalidate = 600

// SEO for this listing is editable in the admin under Page Contents.
const NEWS_PAGE_KEY = 'news'

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
        <div className="mx-auto max-w-[52rem] text-center">
          <h1 className="text-4xl font-bold md:text-5xl">News &amp; Updates</h1>
          <p className="mt-6 text-xl">Stay informed about the latest from DrugCard.</p>
          <p className="mt-3 text-muted-foreground">
            Product releases, industry events, and insights from the world of pharmacovigilance.
          </p>
        </div>
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
  const { locale } = await params

  const content = await fetchPageContent(NEWS_PAGE_KEY, locale)
  const fallback = {
    title: 'News & Updates',
    description:
      'Product releases, industry events, and insights from the world of pharmacovigilance.',
  }

  return buildPageMetadata(content, fallback, { locale, path: '/news' })
}
