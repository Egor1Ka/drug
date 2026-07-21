import React from 'react'

import { CMSLink } from '@/components/Link'
import type { Header } from '@/payload-types'

type LoginLink = NonNullable<Header['ctaButtons']>['loginButton']

export const LoginButton: React.FC<{ link: LoginLink | null }> = ({ link }) => {
  if (!link) return null

  return (
    <CMSLink
      {...link}
      className="hidden rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary lg:inline-flex"
    />
  )
}
