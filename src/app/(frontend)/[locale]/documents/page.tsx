import type { Metadata } from 'next/types'

import { getTranslations, setRequestLocale } from 'next-intl/server'
import { type TypedLocale } from 'payload'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import {
  DocumentsArchive,
  DocumentsCta,
  DocumentsListingLayout,
  fetchPublishedDocuments,
} from '@frontend/_features/documents'
import { fetchFormBySlug } from '@frontend/_features/forms'
import { buildPageMetadata, fetchPageContent } from '@frontend/_features/page-content'
import { Breadcrumbs } from '@frontend/_shared/ui/Breadcrumbs'
import { DownloadGateProvider } from '@frontend/_shared/ui/DownloadGate'
import { Show } from '@frontend/_shared/ui/Show'

// Safety net: even if the revalidation hook misses, the listing refreshes
// within ten minutes.
export const revalidate = 600

// Stable key of the lead form gating every download; editors change the
// fields, labels and confirmation message in the admin, never here.
const DOWNLOAD_FORM_SLUG = 'document-download'

// SEO for this listing is editable in the admin under Page Contents.
const DOCUMENTS_PAGE_KEY = 'documents'

type Args = {
  params: Promise<{ locale: AppLocale }>
}

export default async function DocumentsListingPage({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise

  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'Documents' })

  const [documents, downloadForm] = await Promise.all([
    fetchPublishedDocuments({ locale }),
    fetchFormBySlug(DOWNLOAD_FORM_SLUG, locale as TypedLocale),
  ])

  const crumbs = [{ href: '/', label: t('breadcrumbHome') }, { label: t('title') }]

  const gateLabels = {
    close: t('close'),
    download: t('download'),
    error: t('error'),
    formUnavailable: t('formUnavailable'),
    gateTitle: t('gateTitle'),
    sending: t('sending'),
  }

  return (
    <DownloadGateProvider form={downloadForm} labels={gateLabels}>
      <DocumentsListingLayout>
        <DocumentsListingLayout.Breadcrumbs>
          <Breadcrumbs crumbs={crumbs} />
        </DocumentsListingLayout.Breadcrumbs>

        <DocumentsListingLayout.Header>
          <h1 className="text-4xl font-semibold md:text-5xl">{t('title')}</h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </DocumentsListingLayout.Header>

        <DocumentsListingLayout.Content>
          <Show when={documents.docs.length > 0}>
            <DocumentsArchive items={documents.docs} />
          </Show>
        </DocumentsListingLayout.Content>

        <DocumentsListingLayout.Cta>
          <DocumentsCta />
        </DocumentsListingLayout.Cta>
      </DocumentsListingLayout>
    </DownloadGateProvider>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale } = await params

  const t = await getTranslations({ locale, namespace: 'Documents' })

  const content = await fetchPageContent(DOCUMENTS_PAGE_KEY, locale)
  const fallback = { title: t('title'), description: t('subtitle') }

  return buildPageMetadata(content, fallback, { locale, path: '/documents' })
}
