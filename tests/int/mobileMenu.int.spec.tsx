import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, locale }: { children: React.ReactNode; href: string; locale: string }) => (
    <a href={`/${locale}${href}`}>{children}</a>
  ),
  usePathname: () => '/',
}))

vi.mock('@frontend/_features/contact', () => ({
  ContactModalTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}))

import { MobileMenu } from '@frontend/_features/layout/ui/MobileMenu'
import type { HeaderNavItem } from '@frontend/_features/layout/ui/HeaderNav'

afterEach(cleanup)

const items: HeaderNavItem[] = [
  {
    id: '1',
    link: { label: 'Solution', type: 'custom', url: '/solution' },
    subItems: [
      { id: 's1', link: { label: 'Simple Search', type: 'custom', url: '/simple-search' } },
    ],
  },
  { id: '2', link: { label: 'Blog', type: 'custom', url: '/blog' } },
]

const MESSAGES = {
  Layout: {
    closeMenu: 'Close menu',
    openMenu: 'Open menu',
    switchLanguage: 'Switch language',
    toggleSubmenu: 'Toggle submenu',
  },
}

const renderMenu = () =>
  render(
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <MobileMenu
        demoLabel="Request a Demo"
        items={items}
        loginLink={{ label: 'Log In', type: 'custom', url: 'https://app.drug-card.io/login/en' }}
      />
    </NextIntlClientProvider>,
  )

describe('MobileMenu', () => {
  it('keeps the panel closed initially', () => {
    renderMenu()

    expect(screen.queryByRole('link', { name: 'Blog' })).toBeNull()
  })

  it('opens the panel with every nav item and sub item', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByRole('link', { name: 'Blog' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Simple Search' })).toBeTruthy()
  })

  it('closes the panel again from the close button', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('button', { name: 'Close menu' }))

    expect(screen.queryByRole('link', { name: 'Blog' })).toBeNull()
  })

  it('shows the demo button inside the open panel', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByRole('button', { name: 'Request a Demo' })).toBeTruthy()
  })
})
