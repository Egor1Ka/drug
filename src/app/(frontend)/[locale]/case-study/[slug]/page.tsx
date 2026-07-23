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
  CaseStudyCta,
  CaseStudyPostLayout,
  CaseStudySnapshot,
  fetchAllCaseStudySlugs,
  fetchCaseStudyBySlug,
} from '@frontend/_features/case-studies'
import { formatBlogDate } from '@/utilities/formatBlogDate'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

type Args = {
  params: Promise<{
    locale: AppLocale
    slug?: string
  }>
}

const toSlugParam = ({ slug }: { slug?: string | null }) => ({ slug })

export async function generateStaticParams() {
  const slugs = await fetchAllCaseStudySlugs()

  return slugs.map(toSlugParam)
}

export default async function CaseStudyItem({ params: paramsPromise }: Args) {
  const { locale, slug = '' } = await paramsPromise

  setRequestLocale(locale)

  const { isEnabled: draft } = await draftMode()
  const decodedSlug = decodeURIComponent(slug)
  const url = '/case-study/' + decodedSlug
  const item = await fetchCaseStudyBySlug(decodedSlug, locale)

  if (!item) return <PayloadRedirects url={url} />

  const hasContent = Boolean(item.content)
  const publishedDate = item.publishedAt ? formatBlogDate(item.publishedAt) : null
  const coverImage =
    item.coverImage && typeof item.coverImage === 'object' ? item.coverImage : null

  return (
    <CaseStudyPostLayout>
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <Show when={draft}>
        <LivePreviewListener />
      </Show>

      <CaseStudyPostLayout.Header>
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
      </CaseStudyPostLayout.Header>

      <CaseStudyPostLayout.Snapshot>
        <CaseStudySnapshot
          clientLogo={item.clientLogo}
          clientName={item.clientName}
          productCount={item.productCount}
          region={item.region}
          resultMetric={item.resultMetric}
        />
      </CaseStudyPostLayout.Snapshot>

      <Show when={hasContent}>
        <CaseStudyPostLayout.Content>
          <RichText className="mx-auto max-w-[48rem]" data={item.content} enableGutter={false} />
        </CaseStudyPostLayout.Content>
      </Show>

      <CaseStudyPostLayout.Cta>
        <CaseStudyCta />
      </CaseStudyPostLayout.Cta>
    </CaseStudyPostLayout>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale, slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const item = await fetchCaseStudyBySlug(decodedSlug, locale)

  return generateMeta({ doc: item, url: `/case-study/${decodedSlug}` })
}
