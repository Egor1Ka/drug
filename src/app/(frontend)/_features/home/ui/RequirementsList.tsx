import { CircleCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import React from 'react'

const REQUIREMENT_KEYS = [
  'continuous',
  'traceable',
  'accurate',
  'scalable',
  'multiLanguage',
  'multiRegion',
  'capexFree',
  'costEffective',
] as const

type RequirementKey = (typeof REQUIREMENT_KEYS)[number]

export const RequirementsList: React.FC = () => {
  const t = useTranslations('Home.requirements')

  const renderRequirementItem = (key: RequirementKey) => (
    <li className="flex items-center gap-3" key={key}>
      <CircleCheck className="h-5 w-5 shrink-0 text-primary" />
      <span className="text-[15px] text-foreground/80">{t(`items.${key}`)}</span>
    </li>
  )

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <Image
        alt={t('heading')}
        className="w-full rounded-xl object-cover"
        height={400}
        src="/home/requirements-team.jpg"
        width={600}
      />
      <div>
        <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-[34px]">
          {t('heading')}
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">{t('intro')}</p>
        <ul className="mt-6 space-y-3.5">{REQUIREMENT_KEYS.map(renderRequirementItem)}</ul>
      </div>
    </div>
  )
}
