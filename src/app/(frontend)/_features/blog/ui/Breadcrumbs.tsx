import Link from 'next/link'
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

export const Breadcrumbs: React.FC<{ crumbs: Crumb[] }> = ({ crumbs }) => (
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
    {crumbs.map(renderCrumb)}
  </nav>
)
