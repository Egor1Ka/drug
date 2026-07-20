import { useTranslations } from 'next-intl'
import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'

export const CtaBanner: React.FC = () => {
  const t = useTranslations('Home.cta')

  return (
    <div className="text-center">
      <h2 className="text-3xl font-semibold text-foreground md:text-4xl">{t('heading')}</h2>
      <p className="mt-5 text-muted-foreground">{t('text')}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
        <ContactModalTrigger className="cursor-pointer rounded-full bg-primary px-9 py-3.5 font-semibold text-primary-foreground transition hover:opacity-90">
          {t('scheduleMeeting')}
        </ContactModalTrigger>
        <ContactModalTrigger className="cursor-pointer rounded-full border border-primary px-9 py-3.5 font-semibold text-primary transition hover:bg-primary/5">
          {t('requestDemo')}
        </ContactModalTrigger>
      </div>
    </div>
  )
}
