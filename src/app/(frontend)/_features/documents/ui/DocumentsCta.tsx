import { useTranslations } from 'next-intl'
import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'
import { WAVE_CTA_BUTTON_CLASS, WaveCtaBand } from '@frontend/_shared/ui/WaveCtaBand'

// The "Have questions for our experts?" band that closes the original page.
// Both actions lead to the contact form, as they do on drug-card.io.
export const DocumentsCta: React.FC = () => {
  const t = useTranslations('Documents.cta')

  return (
    <WaveCtaBand heading={t('heading')} text={t('text')}>
      <ContactModalTrigger className={WAVE_CTA_BUTTON_CLASS}>
        {t('bookMeeting')}
      </ContactModalTrigger>
      <ContactModalTrigger className={WAVE_CTA_BUTTON_CLASS}>
        {t('contactUs')}
      </ContactModalTrigger>
    </WaveCtaBand>
  )
}
