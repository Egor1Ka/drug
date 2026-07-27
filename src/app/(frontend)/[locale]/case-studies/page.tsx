import type { Metadata } from 'next/types'

import { getTranslations, setRequestLocale } from 'next-intl/server'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { Show } from '@frontend/_shared/ui/Show'
import {
  CaseStudyArchive,
  CaseStudyListingLayout,
  fetchAllCaseStudies,
} from '@frontend/_features/case-studies'
import { buildPageMetadata, fetchPageContent } from '@frontend/_features/page-content'

export const revalidate = 600

// SEO for this listing is editable in the admin under Page Contents.
const CASE_STUDIES_PAGE_KEY = 'case-studies'

type Args = {
  params: Promise<{ locale: AppLocale }>
}

export default async function CaseStudiesListingPage({ params: paramsPromise }: Args) {
  const { locale } = await paramsPromise

  setRequestLocale(locale)

  const caseStudies = await fetchAllCaseStudies({ locale })

  const t = await getTranslations({ locale, namespace: 'CaseStudies' })

  return (
    <CaseStudyListingLayout>
      <CaseStudyListingLayout.Header>
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
      </CaseStudyListingLayout.Header>

      <CaseStudyListingLayout.Content>
        <Show when={caseStudies.docs.length > 0}>
          <CaseStudyArchive items={caseStudies.docs} />
        </Show>
      </CaseStudyListingLayout.Content>
    </CaseStudyListingLayout>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale } = await params

  const t = await getTranslations({ locale, namespace: 'CaseStudies' })

  const content = await fetchPageContent(CASE_STUDIES_PAGE_KEY, locale)
  const fallback = { title: t('title'), description: t('subtitle') }

  return buildPageMetadata(content, fallback, { locale, path: '/case-studies' })
}
