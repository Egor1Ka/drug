import clsx from 'clsx'
import React from 'react'

type LogoVariant = 'color' | 'white'

const LOGO_SOURCES: Record<LogoVariant, string> = {
  color: '/logo-drugcard.svg',
  white: '/logo-drugcard-white.svg',
}

type SiteLogoProps = {
  className?: string
  priority?: boolean
  variant?: LogoVariant
}

export const SiteLogo: React.FC<SiteLogoProps> = ({
  className,
  priority = false,
  variant = 'color',
}) => (
  /* eslint-disable-next-line @next/next/no-img-element */
  <img
    alt="DrugCard"
    className={clsx('h-9 w-auto', className)}
    decoding="async"
    fetchPriority={priority ? 'high' : 'auto'}
    loading={priority ? 'eager' : 'lazy'}
    src={LOGO_SOURCES[variant]}
  />
)
