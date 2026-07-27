import type { Metadata } from 'next/types'

import { getTranslations, setRequestLocale } from 'next-intl/server'
import { type TypedLocale } from 'payload'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import {
  DocumentGateProvider,
  DocumentsArchive,
  DocumentsCta,
  DocumentsListingLayout,
  fetchPublishedDocuments,
} from '@frontend/_features/documents'
import { fetchFormBySlug } from '@frontend/_features/forms'
import { Breadcrumbs } from '@frontend/_shared/ui/Breadcrumbs'
import { Show } from '@frontend/_shared/ui/Show'
import { buildLocaleAlternates } from '@/utilities/buildLocaleAlternates'

// Safety net: even if the revalidation hook misses, the listing refreshes
// within ten minutes.
export const revalidate = 600

// Stable key of the lead form gating every download; editors change the
// fields, labels and confirmation message in the admin, never here.
const DOWNLOAD_FORM_SLUG = 'document-download'

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

  return (
    <DocumentGateProvider form={downloadForm}>
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
    </DocumentGateProvider>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale } = await params

  const t = await getTranslations({ locale, namespace: 'Documents' })

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: buildLocaleAlternates(locale, '/documents'),
  }
}
