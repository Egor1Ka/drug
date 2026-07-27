import React from 'react'

import type { Document } from '@/payload-types'

import { Media } from '@/components/Media'
import { Show } from '@frontend/_shared/ui/Show'

export type DocumentCardItem = Pick<
  Document,
  'id' | 'slug' | 'title' | 'description' | 'coverImage' | 'file'
>

// Passive view of one document. The action lives in `children` so the card
// never has to know what "getting" a document means — the listing decides.
export const DocumentCard: React.FC<{
  children: React.ReactNode
  item: DocumentCardItem
}> = ({ children, item }) => {
  const { coverImage, description, title } = item

  const cover = coverImage && typeof coverImage === 'object' ? coverImage : null

  return (
    <article className="flex h-full flex-col">
      {/* Covers are text-heavy one-pagers of differing proportions, so they
          render at their natural ratio — a fixed aspect box would crop content
          the reader is meant to see. */}
      <Show when={cover}>
        <div className="overflow-hidden bg-muted">
          {cover && <Media imgClassName="h-auto w-full" resource={cover} size="33vw" />}
        </div>
      </Show>

      <h2 className="mt-6 text-2xl font-medium leading-tight text-foreground">{title}</h2>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {/* mt-auto pins the action to the bottom so buttons line up across a
          row — the original leaves them ragged, which is a defect, not a look. */}
      <div className="mt-auto pt-6">{children}</div>
    </article>
  )
}
