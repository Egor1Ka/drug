'use client'

import { useTranslations } from 'next-intl'
import React, { useEffect, useState } from 'react'

import { CMSLink } from '@/components/Link'
import type { Header } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import type { HeaderNavItem } from './HeaderNav'
import { LocaleSwitcher } from './LocaleSwitcher'
import { NavItemLink } from './NavItemLink'
import { RequestDemoButton } from './RequestDemoButton'
import { SiteLogo } from './SiteLogo'

type LoginLink = NonNullable<Header['ctaButtons']>['loginButton']
type SubItem = NonNullable<HeaderNavItem['subItems']>[number]

const BURGER_PATH = 'M3 6h18M3 12h18M3 18h18'
const CLOSE_PATH = 'M6 6l12 12M18 6L6 18'

const MenuIcon: React.FC<{ path: string }> = ({ path }) => (
  <svg
    aria-hidden="true"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d={path} strokeLinecap="round" />
  </svg>
)

const MobileLoginLink: React.FC<{ link: LoginLink | null }> = ({ link }) => {
  if (!link) return null

  return (
    <CMSLink
      {...link}
      className="rounded-full border border-border px-5 py-3 text-center text-sm font-semibold"
    />
  )
}

const MobileNavItem: React.FC<{ item: HeaderNavItem }> = ({ item }) => {
  const subItems = item.subItems || []

  const toSubLink = (subItem: SubItem, index: number) => (
    <li key={subItem.id || index}>
      <CMSLink {...subItem.link} className="block py-2.5 text-base text-muted-foreground" />
    </li>
  )

  return (
    <li className="border-b border-border py-4">
      <NavItemLink className="block text-lg font-semibold text-foreground" link={item.link} />
      <Show when={subItems.length > 0}>
        <ul className="mt-1 pl-4">{subItems.map(toSubLink)}</ul>
      </Show>
    </li>
  )
}

type MobileMenuProps = {
  demoLabel: string | null
  items: HeaderNavItem[]
  loginLink: LoginLink | null
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ demoLabel, items, loginLink }) => {
  const t = useTranslations('Layout')
  const [isOpen, setIsOpen] = useState(false)

  const openMenu = () => setIsOpen(true)
  const closeMenu = () => setIsOpen(false)

  // Any in-menu navigation must dismiss the panel: delegation catches a click
  // on ANY link inside the menu, including links to the current page.
  const closeIfLinkClicked = (event: React.MouseEvent<HTMLDivElement>) => {
    const clickedLink = (event.target as HTMLElement).closest('a')
    if (clickedLink) closeMenu()
  }

  useEffect(
    function lockBodyScrollWhileOpen() {
      if (!isOpen) return undefined

      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      const restoreBodyScroll = () => {
        document.body.style.overflow = previousOverflow
      }
      return restoreBodyScroll
    },
    [isOpen],
  )

  const toNavItem = (item: HeaderNavItem, index: number) => (
    <MobileNavItem item={item} key={item.id || index} />
  )

  return (
    <div className="lg:hidden">
      <Show when={!isOpen}>
        <button
          aria-label={t('openMenu')}
          className="cursor-pointer p-2"
          onClick={openMenu}
          type="button"
        >
          <MenuIcon path={BURGER_PATH} />
        </button>
      </Show>

      <Show when={isOpen}>
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="container flex h-20 shrink-0 items-center justify-between border-b border-border">
            <SiteLogo />
            <button
              aria-label={t('closeMenu')}
              className="cursor-pointer p-2"
              onClick={closeMenu}
              type="button"
            >
              <MenuIcon path={CLOSE_PATH} />
            </button>
          </div>

          <div className="container flex-1 overflow-y-auto pb-10" onClick={closeIfLinkClicked}>
            <ul>{items.map(toNavItem)}</ul>

            <div className="mt-8 flex flex-col gap-3">
              <MobileLoginLink link={loginLink} />
              <RequestDemoButton className="w-full" label={demoLabel} />
              <div className="mt-2 flex justify-center">
                <LocaleSwitcher />
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
