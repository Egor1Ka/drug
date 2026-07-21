import React from 'react'

import { CMSLink } from '@/components/Link'
import type { Footer } from '@/payload-types'

export type FooterLinkColumn = NonNullable<Footer['linkColumns']>[number]
type ColumnLink = NonNullable<FooterLinkColumn['links']>[number]

const FooterColumn: React.FC<{ column: FooterLinkColumn }> = ({ column }) => {
  const links = column.links || []

  const toLink = (item: ColumnLink, index: number) => (
    <li key={item.id || index}>
      <CMSLink {...item.link} className="text-sm text-white/70 transition hover:text-white" />
    </li>
  )

  return (
    <div>
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
        {column.title}
      </p>
      <ul className="space-y-2">{links.map(toLink)}</ul>
    </div>
  )
}

export const FooterLinkColumns: React.FC<{ columns: FooterLinkColumn[] }> = ({ columns }) => {
  const toColumn = (column: FooterLinkColumn, index: number) => (
    <FooterColumn column={column} key={column.id || index} />
  )

  return <div className="grid grid-cols-2 gap-8 md:grid-cols-3">{columns.map(toColumn)}</div>
}
