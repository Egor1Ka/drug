import Link from 'next/link'
import React from 'react'

import type { CaseStudy } from '@/payload-types'

import { Show } from '@frontend/_shared/ui/Show'
import { formatPublishedDate } from '@/utilities/formatPublishedDate'

export type CaseStudyCardItem = Pick<
  CaseStudy,
  'slug' | 'title' | 'excerpt' | 'publishedAt' | 'clientName' | 'region' | 'resultMetric'
>

export const CaseStudyCard: React.FC<{ item: CaseStudyCardItem }> = ({ item }) => {
  const { excerpt, publishedAt, region, resultMetric, slug, title } = item
  const href = `/case-study/${slug}`

  return (
    <article className="flex flex-col gap-3 py-8">
      <Show when={region}>
        <span className="text-sm font-medium text-primary">{region}</span>
      </Show>

      <h2 className="text-2xl font-semibold leading-snug">
        <Link href={href} className="hover:text-primary">
          {title}
        </Link>
      </h2>

      <Show when={resultMetric}>
        <p className="text-lg font-semibold">{resultMetric}</p>
      </Show>

      <Show when={excerpt}>
        <p className="text-muted-foreground">{excerpt}</p>
      </Show>

      <Show when={publishedAt}>
        <time className="text-sm text-muted-foreground" dateTime={publishedAt || undefined}>
          {publishedAt && formatPublishedDate(publishedAt)}
        </time>
      </Show>

      <Link href={href} className="text-sm font-medium text-primary hover:opacity-90">
        Read case study &raquo;
      </Link>
    </article>
  )
}
