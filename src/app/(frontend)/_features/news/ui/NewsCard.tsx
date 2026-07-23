import Link from 'next/link'
import React from 'react'

import type { News } from '@/payload-types'

import { Show } from '@frontend/_shared/ui/Show'
import { formatBlogDate } from '@/utilities/formatBlogDate'

export type NewsCardItem = Pick<News, 'slug' | 'title' | 'excerpt' | 'publishedAt'>

export const NewsCard: React.FC<{ item: NewsCardItem }> = ({ item }) => {
  const { excerpt, publishedAt, slug, title } = item
  const href = `/news/${slug}`

  return (
    <article className="flex flex-col gap-3 py-8">
      <Show when={publishedAt}>
        <time className="text-sm text-muted-foreground" dateTime={publishedAt || undefined}>
          {publishedAt && formatBlogDate(publishedAt)}
        </time>
      </Show>

      <h2 className="text-2xl font-semibold leading-snug">
        <Link href={href} className="hover:text-primary">
          {title}
        </Link>
      </h2>

      <Show when={excerpt}>
        <p className="text-muted-foreground">{excerpt}</p>
      </Show>

      <Link href={href} className="text-sm font-medium text-primary hover:opacity-90">
        Read more &raquo;
      </Link>
    </article>
  )
}
