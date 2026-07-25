import type { Metadata } from 'next'

import { draftMode } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import { Show } from '@frontend/_shared/ui/Show'
import {
  NewsPostLayout,
  NewsPostNav,
  fetchAdjacentNews,
  fetchAllNewsSlugs,
  fetchNewsBySlug,
} from '@frontend/_features/news'
import { formatPublishedDate } from '@/utilities/formatPublishedDate'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

// Safety net: even if a revalidation hook misses, the page refreshes within
// 10 minutes instead of staying stale forever.
export const revalidate = 600

type Args = {
  params: Promise<{
    locale: AppLocale
    slug?: string
  }>
}

const toSlugParam = ({ slug }: { slug?: string | null }) => ({ slug })

export async function generateStaticParams() {
  const slugs = await fetchAllNewsSlugs()

  return slugs.map(toSlugParam)
}

export default async function NewsItem({ params: paramsPromise }: Args) {
  const { locale, slug = '' } = await paramsPromise

  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const decodedSlug = decodeURIComponent(slug)
  const url = '/news/' + decodedSlug
  const item = await fetchNewsBySlug(decodedSlug, locale)

  if (!item) return <PayloadRedirects url={url} />

  const hasContent = Boolean(item.content)
  const publishedDate = item.publishedAt ? formatPublishedDate(item.publishedAt) : null
  const coverImage =
    item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null

  const adjacent = item.publishedAt
    ? await fetchAdjacentNews(item.publishedAt, locale)
    : { next: null, previous: null }
  const hasAdjacent = Boolean(adjacent.previous || adjacent.next)

  return (
    <NewsPostLayout>
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <Show when={draft}>
        <LivePreviewListener />
      </Show>

      <NewsPostLayout.Header>
        <div className="mx-auto max-w-[48rem]">
          <h1 className="text-3xl font-bold md:text-5xl">{item.title}</h1>

          <Show when={publishedDate}>
            <time
              className="mt-4 block text-sm text-muted-foreground"
              dateTime={item.publishedAt || undefined}
            >
              {publishedDate}
            </time>
          </Show>

          <Show when={coverImage}>
            <div className="mt-8 overflow-hidden rounded-lg">
              <Media imgClassName="w-full" priority resource={coverImage} />
            </div>
          </Show>
        </div>
      </NewsPostLayout.Header>

      <Show when={hasContent}>
        <NewsPostLayout.Content>
          <RichText className="mx-auto max-w-[48rem]" data={item.content} enableGutter={false} />
        </NewsPostLayout.Content>
      </Show>

      <Show when={hasAdjacent}>
        <NewsPostLayout.Nav>
          <NewsPostNav next={adjacent.next} previous={adjacent.previous} />
        </NewsPostLayout.Nav>
      </Show>
    </NewsPostLayout>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale, slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const item = await fetchNewsBySlug(decodedSlug, locale)

  return generateMeta({ doc: item, locale, url: `/news/${decodedSlug}` })
}
