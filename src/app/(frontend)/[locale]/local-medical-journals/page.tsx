import type { Metadata } from 'next/types'

import { getTranslations, setRequestLocale } from 'next-intl/server'
import { type TypedLocale } from 'payload'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { fetchFormBySlug } from '@frontend/_features/forms'
import {
  JournalsArchive,
  JournalsCta,
  JournalsListingLayout,
  fetchPublishedJournals,
} from '@frontend/_features/journals'
import { buildPageMetadata, fetchPageContent } from '@frontend/_features/page-content'
import { Breadcrumbs } from '@frontend/_shared/ui/Breadcrumbs'
import { DownloadGateProvider } from '@frontend/_shared/ui/DownloadGate'
import { Show } from '@frontend/_shared/ui/Show'

// Safety net: even if the revalidation hook misses, the listing refreshes
// within ten minutes.
export const revalidate = 600

// Journals keep their own lead form, separate from the documents one, so
// journal requests stay separable from whitepaper requests.
const DOWNLOAD_FORM_SLUG = 'journal-download'

// SEO for this listing is editable in the admin under Page Contents.
const JOURNALS_PAGE_KEY = 'journals'

type Args = {
  params: Promise<{ locale: AppLocale }>
}

export default async function JournalsListingPage({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise

  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'Journals' })

  const [journals, downloadForm] = await Promise.all([
    fetchPublishedJournals({ locale }),
    fetchFormBySlug(DOWNLOAD_FORM_SLUG, locale as TypedLocale),
  ])

  const crumbs = [{ href: '/', label: t('breadcrumbHome') }, { label: t('breadcrumbCurrent') }]

  const gateLabels = {
    close: t('close'),
    download: t('downloadFile'),
    error: t('error'),
    formUnavailable: t('formUnavailable'),
    gateTitle: t('gateTitle'),
    sending: t('sending'),
  }

  return (
    <DownloadGateProvider form={downloadForm} labels={gateLabels}>
      <JournalsListingLayout>
        <JournalsListingLayout.Breadcrumbs>
          <Breadcrumbs crumbs={crumbs} />
        </JournalsListingLayout.Breadcrumbs>

        <JournalsListingLayout.Header>
          <h1 className="text-4xl font-semibold md:text-5xl">{t('title')}</h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </JournalsListingLayout.Header>

        <JournalsListingLayout.Content>
          <Show when={journals.docs.length > 0}>
            <JournalsArchive items={journals.docs} />
          </Show>
        </JournalsListingLayout.Content>

        <JournalsListingLayout.Cta>
          <JournalsCta />
        </JournalsListingLayout.Cta>
      </JournalsListingLayout>
    </DownloadGateProvider>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale } = await params

  const t = await getTranslations({ locale, namespace: 'Journals' })

  const content = await fetchPageContent(JOURNALS_PAGE_KEY, locale)
  const fallback = { title: t('title'), description: t('subtitle') }

  return buildPageMetadata(content, fallback, { locale, path: '/local-medical-journals' })
}
