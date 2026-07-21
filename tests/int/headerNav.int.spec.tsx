import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { HeaderNav, type HeaderNavItem } from '@frontend/_features/layout/ui/HeaderNav'

afterEach(cleanup)

const renderNav = (items: HeaderNavItem[]) =>
  render(
    <NextIntlClientProvider locale="en" messages={{ Layout: { toggleSubmenu: 'Toggle submenu' } }}>
      <HeaderNav items={items} />
    </NextIntlClientProvider>,
  )

const plainItem: HeaderNavItem = {
  id: '1',
  link: { label: 'Contact us', type: 'custom', url: '/contact-us' },
}

const itemWithSubmenu: HeaderNavItem = {
  id: '2',
  link: { label: 'Solution', type: 'custom', url: '/solution' },
  subItems: [
    { id: 's1', link: { label: 'DrugCard Platform', type: 'custom', url: '/local-literature' } },
    { id: 's2', link: { label: 'Simple Search', type: 'custom', url: '/simple-search' } },
  ],
}

describe('HeaderNav', () => {
  it('renders a plain item as a link without a submenu trigger', () => {
    renderNav([plainItem])

    expect(screen.getByRole('link', { name: 'Contact us' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /submenu/i })).toBeNull()
  })

  it('keeps the parent of a submenu clickable as a link', () => {
    renderNav([itemWithSubmenu])

    expect(screen.getByRole('link', { name: 'Solution' })).toBeTruthy()
  })

  it('hides submenu links until the item is opened', () => {
    renderNav([itemWithSubmenu])

    expect(screen.queryByRole('link', { name: 'Simple Search' })).toBeNull()
  })

  it('reveals submenu links after clicking the toggle', async () => {
    const user = userEvent.setup()
    renderNav([itemWithSubmenu])

    await user.click(screen.getByRole('button', { name: /submenu/i }))

    expect(screen.getByRole('link', { name: 'Simple Search' })).toBeTruthy()
  })

  it('hides submenu links again after clicking the toggle a second time', async () => {
    const user = userEvent.setup()
    renderNav([itemWithSubmenu])

    const toggle = screen.getByRole('button', { name: /submenu/i })
    await user.click(toggle)
    await user.click(toggle)

    expect(screen.queryByRole('link', { name: 'Simple Search' })).toBeNull()
  })

  it('closes the submenu and returns focus to the toggle when Escape is pressed', async () => {
    const user = userEvent.setup()
    renderNav([itemWithSubmenu])

    const toggle = screen.getByRole('button', { name: /submenu/i })
    await user.click(toggle)

    const submenuLink = screen.getByRole('link', { name: 'Simple Search' })
    submenuLink.focus()
    expect(document.activeElement).toBe(submenuLink)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('link', { name: 'Simple Search' })).toBeNull()
    expect(document.activeElement).toBe(toggle)
  })

  it('renders nothing when there are no items', () => {
    const { container } = renderNav([])

    expect(container.querySelectorAll('a').length).toBe(0)
  })
})
