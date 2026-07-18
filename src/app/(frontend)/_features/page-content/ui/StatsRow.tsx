import React from 'react'

import type { StatsSectionBlock } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

type StatItem = StatsSectionBlock['items'][number]

const renderStatItem = (item: StatItem, index: number) => (
  <li className="text-center" key={item.id || index}>
    <div className="text-5xl font-medium text-primary md:text-[56px]">{item.value}</div>
    <div className="mt-3 text-lg font-bold text-foreground">{item.label}</div>
    <Show when={!!item.sublabel}>
      <div className="mt-1 text-sm text-muted-foreground">{item.sublabel}</div>
    </Show>
  </li>
)

type StatsRowProps = {
  heading?: string
  section: StatsSectionBlock
}

export const StatsRow: React.FC<StatsRowProps> = ({ heading, section }) => (
  <div>
    <Show when={!!heading}>
      <h2 className="mb-12 text-center text-3xl font-semibold text-foreground md:text-4xl">
        {heading}
      </h2>
    </Show>
    <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-10 lg:grid-cols-4">
      {section.items.map(renderStatItem)}
    </ul>
  </div>
)
