import { useTranslations } from 'next-intl'
import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'
import { WAVE_CTA_BUTTON_CLASS, WaveCtaBand } from '@frontend/_shared/ui/WaveCtaBand'

// The "Have questions for our experts?" band that closes the original page.
// Its copy differs from the documents page by two words ("medical literature
// screening" instead of "literature monitoring"), so it keeps its own strings.
export const JournalsCta: React.FC = () => {
  const t = useTranslations('Journals.cta')

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
