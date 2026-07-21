import Link from 'next/link'
import type { TypedLocale } from 'payload'
import React from 'react'

import { fetchHeaderData } from '../api/header'
import { HeaderLayout } from './HeaderLayout'
import { HeaderNav } from './HeaderNav'
import { LocaleSwitcher } from './LocaleSwitcher'
import { LoginButton } from './LoginButton'
import { MobileMenu } from './MobileMenu'
import { RequestDemoButton } from './RequestDemoButton'
import { SiteLogo } from './SiteLogo'

export const SiteHeader = async ({ locale }: { locale: TypedLocale }) => {
  const header = await fetchHeaderData(locale)

  const navItems = header?.navItems || []
  const ctaButtons = header?.ctaButtons
  const loginLink = ctaButtons ? ctaButtons.loginButton : null
  const demoLabel = ctaButtons ? (ctaButtons.demoButtonLabel ?? null) : null

  return (
    <HeaderLayout>
      <HeaderLayout.Logo>
        <Link href={`/${locale}`}>
          <SiteLogo priority />
        </Link>
      </HeaderLayout.Logo>

      <HeaderLayout.Nav>
        <HeaderNav items={navItems} />
      </HeaderLayout.Nav>

      <HeaderLayout.Actions>
        <LocaleSwitcher />

        <LoginButton link={loginLink} />

        <RequestDemoButton className="hidden lg:inline-flex" label={demoLabel} />

        <MobileMenu demoLabel={demoLabel} items={navItems} loginLink={loginLink} />
      </HeaderLayout.Actions>
    </HeaderLayout>
  )
}
