'use client'
import { Header } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

type NavItem = NonNullable<Header['navItems']>[number]

const subItemsSuffix = (item: NavItem) => {
  const count = item.subItems ? item.subItems.length : 0

  if (!count) return ''

  return ` (${count})`
}

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NavItem>()
  const item = data?.data

  if (!item || !item.link || !item.link.label) return <div>Row</div>

  const position = data.rowNumber !== undefined ? data.rowNumber + 1 : ''

  return (
    <div>{`Nav item ${position}: ${item.link.label}${subItemsSuffix(item)}`}</div>
  )
}
