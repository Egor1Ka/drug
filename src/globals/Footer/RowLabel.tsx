'use client'
import { Footer } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

type LinkColumn = NonNullable<Footer['linkColumns']>[number]

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<LinkColumn>()
  const column = data?.data

  if (!column || !column.title) return <div>Column</div>

  const linksCount = column.links ? column.links.length : 0

  return <div>{`${column.title} (${linksCount})`}</div>
}
