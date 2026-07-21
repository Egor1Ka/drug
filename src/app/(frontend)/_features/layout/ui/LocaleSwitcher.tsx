'use client'

import { useLocale, useTranslations } from 'next-intl'
import React from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { cn } from '@/utilities/ui'

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'EN',
  uk: 'UK',
}

export const LocaleSwitcher: React.FC = () => {
  const t = useTranslations('Layout')
  const activeLocale = useLocale()
  // usePathname из next-intl отдаёт путь БЕЗ префикса локали,
  // поэтому Link с пропом locale переключает язык, сохраняя страницу.
  const pathname = usePathname()

  const toLocaleLink = (locale: AppLocale) => {
    const isActive = locale === activeLocale

    return (
      <Link
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'px-1 text-sm font-semibold transition',
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
        href={pathname}
        key={locale}
        locale={locale}
      >
        {LOCALE_LABELS[locale]}
      </Link>
    )
  }

  return (
    <div aria-label={t('switchLanguage')} className="flex items-center gap-1">
      {routing.locales.map(toLocaleLink)}
    </div>
  )
}
