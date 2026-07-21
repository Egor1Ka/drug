import React from 'react'

import { CMSLink } from '@/components/Link'
import type { Footer } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

type Legal = Footer['legal']
type LegalLink = NonNullable<NonNullable<Legal>['legalLinks']>[number]

export const FooterLegal: React.FC<{ legal: Legal }> = ({ legal }) => {
  const copyright = legal ? legal.copyright : null
  const legalLinks = legal && legal.legalLinks ? legal.legalLinks : []

  const toLegalLink = (item: LegalLink, index: number) => (
    <CMSLink
      {...item.link}
      className="text-xs text-white/60 transition hover:text-white"
      key={item.id || index}
    />
  )

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <Show when={!!copyright}>
        <p className="text-xs text-white/60">{copyright}</p>
      </Show>

      <Show when={legalLinks.length > 0}>
        <div className="flex flex-wrap gap-4">{legalLinks.map(toLegalLink)}</div>
      </Show>
    </div>
  )
}
