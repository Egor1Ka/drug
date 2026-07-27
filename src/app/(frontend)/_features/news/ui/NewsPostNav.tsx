import Link from 'next/link'
import { useTranslations } from 'next-intl'
import React from 'react'

import { Show } from '@frontend/_shared/ui/Show'

import type { AdjacentNewsLink } from '../api/news'

type Direction = 'next' | 'previous'

const AdjacentLink: React.FC<{ direction: Direction; item: AdjacentNewsLink }> = ({
  direction,
  item,
}) => {
  const t = useTranslations('News')
  const isPrevious = direction === 'previous'

  return (
    <Link
      href={`/news/${item.slug}`}
      className={`group flex items-start gap-3 ${isPrevious ? '' : 'justify-end text-right'}`}
    >
      <Show when={isPrevious}>
        <span aria-hidden className="mt-1 text-2xl leading-none text-muted-foreground">
          &lsaquo;
        </span>
      </Show>

      <span>
        <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
          {t(direction)}
        </span>
        <span className="mt-2 block text-lg font-medium leading-snug group-hover:text-primary">
          {item.title}
        </span>
      </span>

      <Show when={!isPrevious}>
        <span aria-hidden className="mt-1 text-2xl leading-none text-muted-foreground">
          &rsaquo;
        </span>
      </Show>
    </Link>
  )
}

// Prev/next footer of the news detail page, mirroring the original site.
export const NewsPostNav: React.FC<{
  next: AdjacentNewsLink | null
  previous: AdjacentNewsLink | null
}> = ({ next, previous }) => {
  const t = useTranslations('News')

  return (
  <nav aria-label={t('moreNews')} className="flex items-start justify-between gap-8">
    <div className="flex-1">
      <Show when={!!previous}>
        <AdjacentLink direction="previous" item={previous!} />
      </Show>
    </div>

    <div className="flex-1">
      <Show when={!!next}>
        <AdjacentLink direction="next" item={next!} />
      </Show>
    </div>
    </nav>
  )
}
