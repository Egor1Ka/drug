import { useTranslations } from 'next-intl'
import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'

export const CaseStudyCta: React.FC = () => {
  const t = useTranslations('CaseStudies.cta')

  return (
    <section className="mx-auto max-w-3xl rounded-lg bg-primary px-8 py-12 text-center text-primary-foreground">
      <h2 className="text-3xl font-bold">{t('heading')}</h2>
      <p className="mt-3 text-primary-foreground/90">{t('text')}</p>
      <ContactModalTrigger className="mt-6 inline-flex items-center rounded-md bg-background px-6 py-3 text-sm font-semibold text-foreground hover:opacity-90">
        {t('button')}
      </ContactModalTrigger>
    </section>
  )
}
