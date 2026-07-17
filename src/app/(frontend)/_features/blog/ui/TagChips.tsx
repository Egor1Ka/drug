import Link from 'next/link'
import React from 'react'

import type { Post, Tag } from '@/payload-types'

const isTagObject = (tag: Tag | string): tag is Tag => typeof tag === 'object'

const renderChip = (tag: Tag) => (
  <Link
    key={tag.slug}
    href={`/blog/tag/${tag.slug}`}
    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
  >
    {tag.title}
  </Link>
)

export const TagChips: React.FC<{ tags: NonNullable<Post['tags']> }> = ({ tags }) => {
  const tagObjects = tags.filter(isTagObject)

  if (tagObjects.length === 0) return null

  return <div className="flex flex-wrap gap-2">{tagObjects.map(renderChip)}</div>
}
