import Link from 'next/link'
import React from 'react'

import type { News } from '@/payload-types'

import { Show } from '@frontend/_shared/ui/Show'
import { formatPublishedDate } from '@/utilities/formatPublishedDate'

export type NewsCardItem = Pick<News, 'slug' | 'title' | 'excerpt' | 'publishedAt'>

// Mirrors the original drug-card.io news card: white card, title, excerpt,
// "READ MORE »" link, publication date at the bottom under a divider.
export const NewsCard: React.FC<{ item: NewsCardItem }> = ({ item }) => {
  const { excerpt, publishedAt, slug, title } = item
  const href = `/news/${slug}`

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h2 className="text-xl font-bold leading-snug">
          <Link href={href} className="hover:text-primary">
            {title}
          </Link>
        </h2>

        <Show when={excerpt}>
          <p className="line-clamp-4 text-sm text-muted-foreground">{excerpt}</p>
        </Show>

        <Link
          href={href}
          className="mt-auto text-xs font-semibold uppercase tracking-wide text-primary hover:opacity-90"
        >
          Read more &raquo;
        </Link>
      </div>

      <Show when={publishedAt}>
        <div className="border-t border-border px-6 py-4">
          <time className="text-sm text-muted-foreground" dateTime={publishedAt || undefined}>
            {publishedAt && formatPublishedDate(publishedAt)}
          </time>
        </div>
      </Show>
    </article>
  )
}
