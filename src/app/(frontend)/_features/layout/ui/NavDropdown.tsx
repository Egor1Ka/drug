'use client'

import React, { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'

import type { HeaderNavItem } from './HeaderNav'
import { NavItemLink } from './NavItemLink'

type SubItem = NonNullable<HeaderNavItem['subItems']>[number]

const CHEVRON_PATH = 'M4 6L8 10L12 6'

const SUBMENU_BASE_CLASSNAME =
  'absolute left-0 top-full z-30 min-w-56 rounded-lg border border-border bg-background py-2 shadow-lg transition-opacity'

const SUBMENU_HOVER_REVEAL_CLASSNAME =
  'group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100'

const getSubmenuVisibilityClassName = (isOpen: boolean) =>
  cn(
    SUBMENU_BASE_CLASSNAME,
    'invisible pointer-events-none opacity-0',
    SUBMENU_HOVER_REVEAL_CLASSNAME,
    isOpen && 'visible pointer-events-auto opacity-100',
  )

export const NavDropdown: React.FC<{ item: HeaderNavItem }> = ({ item }) => {
  const t = useTranslations('Layout')
  const [isOpen, setIsOpen] = useState(false)
  const toggleButtonRef = useRef<HTMLButtonElement>(null)

  const toggleMenu = () => setIsOpen((previousIsOpen) => !previousIsOpen)
  const closeMenu = () => setIsOpen(false)

  const closeMenuAndFocusToggle = () => {
    setIsOpen(false)

    if (!toggleButtonRef.current) return

    toggleButtonRef.current.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') closeMenuAndFocusToggle()
  }

  const subItems = item.subItems || []

  const toSubLink = (subItem: SubItem, index: number) => (
    <li key={subItem.id || index}>
      <CMSLink
        {...subItem.link}
        className="block whitespace-nowrap px-4 py-2 text-sm text-foreground transition hover:bg-muted"
      />
    </li>
  )

  return (
    <div className="group relative" onBlur={closeMenu} onKeyDown={handleKeyDown}>
      <span className="flex items-center gap-1">
        <NavItemLink
          className="text-sm font-semibold text-foreground transition hover:text-primary"
          link={item.link}
        />
        <button
          aria-expanded={isOpen}
          aria-label={t('toggleSubmenu')}
          className="cursor-pointer p-1"
          onClick={toggleMenu}
          ref={toggleButtonRef}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 16 16"
          >
            <path d={CHEVRON_PATH} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </span>

      <ul aria-hidden={!isOpen} className={getSubmenuVisibilityClassName(isOpen)}>
        {subItems.map(toSubLink)}
      </ul>
    </div>
  )
}
