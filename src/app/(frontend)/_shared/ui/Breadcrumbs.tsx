import Link from 'next/link'
import { useTranslations } from 'next-intl'
import React, { Fragment } from 'react'

export type Crumb = {
  href?: string
  label: string
}

const renderCrumb = (crumb: Crumb, index: number) => (
  <Fragment key={`${crumb.label}-${index}`}>
    {index > 0 && <span className="text-muted-foreground">/</span>}
    {crumb.href ? (
      <Link href={crumb.href} className="text-primary hover:underline">
        {crumb.label}
      </Link>
    ) : (
      <span className="text-muted-foreground">{crumb.label}</span>
    )}
  </Fragment>
)

export const Breadcrumbs: React.FC<{ crumbs: Crumb[] }> = ({ crumbs }) => {
  // The landmark label is read out by screen readers, so it is translated too.
  // `Layout` is the neutral namespace for chrome strings with no feature owner.
  const t = useTranslations('Layout')

  return (
    <nav aria-label={t('breadcrumb')} className="flex flex-wrap items-center gap-2 text-sm">
      {crumbs.map(renderCrumb)}
    </nav>
  )
}
