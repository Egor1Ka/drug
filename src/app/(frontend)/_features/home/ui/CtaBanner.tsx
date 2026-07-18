import { useTranslations } from 'next-intl'
import React from 'react'

import { Link } from '@/i18n/navigation'

import { REQUEST_DEMO_PATH, SCHEDULE_MEETING_PATH } from '../links'

export const CtaBanner: React.FC = () => {
  const t = useTranslations('Home.cta')

  return (
    <div className="text-center">
      <h2 className="text-3xl font-semibold text-foreground md:text-4xl">{t('heading')}</h2>
      <p className="mt-5 text-muted-foreground">{t('text')}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
        <Link
          className="rounded-full bg-primary px-9 py-3.5 font-semibold text-primary-foreground transition hover:opacity-90"
          href={SCHEDULE_MEETING_PATH}
        >
          {t('scheduleMeeting')}
        </Link>
        <Link
          className="rounded-full border border-primary px-9 py-3.5 font-semibold text-primary transition hover:bg-primary/5"
          href={REQUEST_DEMO_PATH}
        >
          {t('requestDemo')}
        </Link>
      </div>
    </div>
  )
}
