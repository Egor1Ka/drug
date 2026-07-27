import { useTranslations } from 'next-intl'
import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'

// The "Have questions for our experts?" band that closes the original page.
// Both actions lead to the contact form, as they do on drug-card.io.
export const DocumentsCta: React.FC = () => {
  const t = useTranslations('Documents.cta')

  return (
    <section className="bg-primary px-6 py-16 text-center text-primary-foreground">
      <h2 className="text-3xl font-semibold md:text-4xl">{t('heading')}</h2>
      <p className="mx-auto mt-5 max-w-2xl text-primary-foreground/90">{t('text')}</p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
        <ContactModalTrigger className="cursor-pointer rounded-full bg-background px-9 py-3.5 font-semibold text-foreground transition hover:opacity-90">
          {t('bookMeeting')}
        </ContactModalTrigger>
        <ContactModalTrigger className="cursor-pointer rounded-full border border-primary-foreground px-9 py-3.5 font-semibold text-primary-foreground transition hover:bg-primary-foreground/10">
          {t('contactUs')}
        </ContactModalTrigger>
      </div>
    </section>
  )
}
