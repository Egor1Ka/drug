import Link from 'next/link'
import React from 'react'

import type { Category } from '@/payload-types'

import { cn } from '@/utilities/ui'

type CategoryTab = {
  href: string
  isActive: boolean
  title: string
}

const toTab =
  (activeSlug?: string) =>
  (category: Category): CategoryTab => ({
    href: `/blog?category=${category.slug}`,
    isActive: category.slug === activeSlug,
    title: category.title,
  })

const renderTab = (tab: CategoryTab) => (
  <Link
    key={tab.href}
    href={tab.href}
    className={cn(
      'rounded-full border px-4 py-1.5 text-sm transition-colors',
      tab.isActive
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border hover:border-primary',
    )}
  >
    {tab.title}
  </Link>
)

export const CategoryTabs: React.FC<{ activeSlug?: string; categories: Category[] }> = ({
  activeSlug,
  categories,
}) => {
  const allTab: CategoryTab = { href: '/blog', isActive: !activeSlug, title: 'All' }
  const tabs = [allTab, ...categories.map(toTab(activeSlug))]

  return <nav className="flex flex-wrap gap-3">{tabs.map(renderTab)}</nav>
}
