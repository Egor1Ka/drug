import { useTranslations } from 'next-intl'
import Image from 'next/image'
import React from 'react'

const PRESSURE_CARDS = [
  { iconSrc: '/home/pressures/ai-competition.png', key: 'aiCompetition' },
  { iconSrc: '/home/pressures/tech-age.png', key: 'techAge' },
  { iconSrc: '/home/pressures/audits.png', key: 'audits' },
  { iconSrc: '/home/pressures/people-costs.png', key: 'peopleCosts' },
  { iconSrc: '/home/pressures/market-stress.png', key: 'marketStress' },
  { iconSrc: '/home/pressures/new-markets.png', key: 'newMarkets' },
] as const

type PressureCard = (typeof PRESSURE_CARDS)[number]

export const PressureCards: React.FC = () => {
  const t = useTranslations('Home.pressures')

  const renderPressureCard = ({ iconSrc, key }: PressureCard) => (
    <li key={key}>
      <Image alt="" className="h-24 w-auto" height={106} src={iconSrc} width={100} />
      <h3 className="mt-5 text-lg font-semibold text-foreground">{t(`cards.${key}.title`)}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        {t(`cards.${key}.text`)}
      </p>
    </li>
  )

  return (
    <div>
      <header className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold text-foreground md:text-4xl md:leading-tight">
          {t('heading')}
        </h2>
        <p className="mt-5 text-muted-foreground">{t('intro')}</p>
      </header>
      <ul className="mx-auto mt-14 grid max-w-6xl gap-x-16 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {PRESSURE_CARDS.map(renderPressureCard)}
      </ul>
    </div>
  )
}
