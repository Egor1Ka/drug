import type { Metadata } from 'next/types'

import { getTranslations, setRequestLocale } from 'next-intl/server'
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

  const t = await getTranslations({ locale, namespace: 'News' })

  return (
    <NewsListingLayout>
      <NewsListingLayout.Header>
        <div className="mx-auto max-w-208 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">{t('title')}</h1>
          <p className="mt-6 text-xl">{t('subtitle')}</p>
          <p className="mt-3 text-muted-foreground">{t('description')}</p>
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

  const t = await getTranslations({ locale, namespace: 'News' })

  const content = await fetchPageContent(NEWS_PAGE_KEY, locale)
  const fallback = { title: t('title'), description: t('description') }

  return buildPageMetadata(content, fallback, { locale, path: '/news' })
}
