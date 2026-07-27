import { useTranslations } from 'next-intl'
import React from 'react'

import type { CaseStudy } from '@/payload-types'

import { Media } from '@/components/Media'
import { Show } from '@frontend/_shared/ui/Show'

type CaseStudySnapshotProps = Pick<
  CaseStudy,
  'clientName' | 'clientLogo' | 'region' | 'productCount' | 'resultMetric'
>

export const CaseStudySnapshot: React.FC<CaseStudySnapshotProps> = ({
  clientLogo,
  clientName,
  productCount,
  region,
  resultMetric,
}) => {
  const t = useTranslations('CaseStudies.snapshot')

  const logo = clientLogo && typeof clientLogo === 'object' ? clientLogo : null

  return (
    <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-6 rounded-lg border border-border bg-muted/40 p-6">
      <div className="flex items-center gap-4">
        <Show when={logo}>
          <Media imgClassName="h-12 w-auto object-contain" resource={logo} />
        </Show>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t('client')}</dt>
          <dd className="text-lg font-semibold">{clientName}</dd>
        </div>
      </div>

      <Show when={region}>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t('location')}</dt>
          <dd className="text-lg font-semibold">{region}</dd>
        </div>
      </Show>

      <Show when={typeof productCount === 'number'}>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t('products')}</dt>
          <dd className="text-lg font-semibold">{productCount}</dd>
        </div>
      </Show>

      <Show when={resultMetric}>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t('result')}</dt>
          <dd className="text-lg font-semibold">{resultMetric}</dd>
        </div>
      </Show>
    </dl>
  )
}
