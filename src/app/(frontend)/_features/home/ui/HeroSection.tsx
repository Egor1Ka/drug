import { useTranslations } from 'next-intl'
import React from 'react'

import { Link } from '@/i18n/navigation'

import { CONTACT_PATH } from '../links'

export const HeroSection: React.FC = () => {
  const t = useTranslations('Home.hero')

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-[1.2] text-foreground md:text-[42px]">
        {t('headline')}
      </h1>
      <p className="mt-3 text-xl font-medium text-foreground">{t('tagline')}</p>
      <Link
        className="mt-9 inline-block rounded-full bg-primary px-9 py-3.5 font-semibold text-primary-foreground transition hover:opacity-90"
        href={CONTACT_PATH}
      >
        {t('cta')}
      </Link>
    </div>
  )
}
