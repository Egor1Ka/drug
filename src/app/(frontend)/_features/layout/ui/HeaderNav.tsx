'use client'

import React from 'react'

import type { Header } from '@/payload-types'

import { NavDropdown } from './NavDropdown'
import { NavItemLink } from './NavItemLink'

export type HeaderNavItem = NonNullable<Header['navItems']>[number]

const hasSubItems = (item: HeaderNavItem) => !!item.subItems && item.subItems.length > 0

const NavEntry: React.FC<{ item: HeaderNavItem }> = ({ item }) => {
  if (hasSubItems(item)) return <NavDropdown item={item} />

  return (
    <NavItemLink
      className="text-sm font-semibold text-foreground transition hover:text-primary"
      link={item.link}
    />
  )
}

export const HeaderNav: React.FC<{ items: HeaderNavItem[] }> = ({ items }) => {
  const toNavEntry = (item: HeaderNavItem, index: number) => (
    <NavEntry item={item} key={item.id || index} />
  )

  return <nav className="flex items-center gap-6">{items.map(toNavEntry)}</nav>
}
