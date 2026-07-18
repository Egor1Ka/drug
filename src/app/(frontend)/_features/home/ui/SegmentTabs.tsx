'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import React, { useState } from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/utilities/ui'

import { CONTACT_PATH } from '../links'

const SEGMENTS = [
  { imageSrc: '/home/segments/cros.jpg', key: 'cros' },
  { imageSrc: '/home/segments/mahs.jpg', key: 'mahs' },
  { imageSrc: '/home/segments/freelancers.jpg', key: 'freelancers' },
] as const

type Segment = (typeof SEGMENTS)[number]
type SegmentKey = Segment['key']

export const SegmentTabs: React.FC = () => {
  const t = useTranslations('Home.segments')
  const [activeKey, setActiveKey] = useState<SegmentKey>('cros')

  const activeSegment = SEGMENTS.find(isActiveSegment)

  function isActiveSegment(segment: Segment) {
    return segment.key === activeKey
  }

  const selectSegment = (key: SegmentKey) => () => setActiveKey(key)

  const renderTabButton = ({ key }: Segment) => (
    <button
      className={cn(
        'cursor-pointer px-10 py-3 text-base font-semibold transition',
        key === activeKey
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-border/50',
      )}
      key={key}
      onClick={selectSegment(key)}
      type="button"
    >
      {t(`tabs.${key}`)}
    </button>
  )

  if (!activeSegment) return null

  return (
    <div>
      <h2 className="text-center text-3xl font-semibold text-foreground md:text-4xl">
        {t('heading')}
      </h2>
      <div className="mt-10 flex justify-center">
        <div className="inline-flex overflow-hidden rounded-lg bg-muted">
          {SEGMENTS.map(renderTabButton)}
        </div>
      </div>
      <div
        className="mt-12 grid animate-in fade-in slide-in-from-bottom-6 items-start gap-12 duration-500 lg:grid-cols-2"
        key={activeKey}
      >
        <Image
          alt={t(`cards.${activeSegment.key}.title`)}
          className="w-full rounded-lg object-cover"
          height={424}
          src={activeSegment.imageSrc}
          width={600}
        />
        <div>
          <h3 className="text-2xl font-semibold leading-[1.3] text-foreground md:text-[28px]">
            {t(`cards.${activeSegment.key}.title`)}
          </h3>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            {t(`cards.${activeSegment.key}.text`)}
          </p>
          <Link
            className="mt-9 inline-block rounded-full border border-border px-9 py-3 font-semibold text-primary transition hover:border-primary"
            href={CONTACT_PATH}
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
