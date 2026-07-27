import React from 'react'

import type { Journal } from '@/payload-types'

import { Media } from '@/components/Media'
import { Show } from '@frontend/_shared/ui/Show'

export type JournalCardItem = Pick<
  Journal,
  'id' | 'slug' | 'title' | 'country' | 'coverImage' | 'file'
>

// Passive view of one country's journal list. No description on this card —
// the original has none either; the cover carries the information.
export const JournalCard: React.FC<{
  children: React.ReactNode
  item: JournalCardItem
}> = ({ children, item }) => {
  const { coverImage, title } = item

  const cover = coverImage && typeof coverImage === 'object' ? coverImage : null

  return (
    <article className="flex h-full flex-col">
      {/* Natural ratio, no crop: the cover is a readable table of journals. */}
      <Show when={cover}>
        <div className="overflow-hidden bg-muted">
          {cover && <Media imgClassName="h-auto w-full" resource={cover} size="33vw" />}
        </div>
      </Show>

      <h2 className="mt-6 text-2xl font-medium leading-tight text-foreground">{title}</h2>

      {/* mt-auto pins the action to the bottom so buttons line up across a
          row — the original leaves them ragged, which is a defect, not a look. */}
      <div className="mt-auto flex justify-center pt-6">{children}</div>
    </article>
  )
}
