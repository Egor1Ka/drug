import React from 'react'

import { CMSLink } from '@/components/Link'

import type { HeaderNavItem } from './HeaderNav'

type NavLink = HeaderNavItem['link']

// A nav item with a Custom URL renders as a link; one without a URL renders as
// plain, non-clickable text (a pure dropdown parent that only opens its submenu).
const hasDestination = (link: NavLink) => {
  if (!link) return false

  return !!link.url
}

type NavItemLinkProps = {
  className?: string
  link: NavLink
}

export const NavItemLink: React.FC<NavItemLinkProps> = ({ className, link }) => {
  if (!hasDestination(link)) {
    return <span className={className}>{link ? link.label : ''}</span>
  }

  return <CMSLink {...link} className={className} />
}
