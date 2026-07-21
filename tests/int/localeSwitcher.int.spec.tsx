import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    locale,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    locale: string
  }) => (
    <a data-locale={locale} href={`/${locale}${href}`} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/blog',
}))

import { LocaleSwitcher } from '@frontend/_features/layout/ui/LocaleSwitcher'

afterEach(cleanup)

const renderSwitcher = (locale: string) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ Layout: { switchLanguage: 'Switch language' } }}
    >
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  )

describe('LocaleSwitcher', () => {
  it('renders one link per configured locale', () => {
    renderSwitcher('en')

    expect(screen.getByText('EN')).toBeTruthy()
    expect(screen.getByText('UK')).toBeTruthy()
  })

  it('keeps the current pathname when switching locale', () => {
    renderSwitcher('en')

    const ukLink = screen.getByText('UK').closest('a') as HTMLAnchorElement

    expect(ukLink.getAttribute('href')).toBe('/uk/blog')
  })

  it('marks the active locale with aria-current', () => {
    renderSwitcher('uk')

    const ukLink = screen.getByText('UK').closest('a') as HTMLAnchorElement
    const enLink = screen.getByText('EN').closest('a') as HTMLAnchorElement

    expect(ukLink.getAttribute('aria-current')).toBe('true')
    expect(enLink.getAttribute('aria-current')).toBeNull()
  })
})
