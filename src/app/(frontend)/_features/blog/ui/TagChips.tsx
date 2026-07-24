import Link from 'next/link'
import React from 'react'

import type { Post, Tag } from '@/payload-types'
import { isResolvedRelation } from '@/utilities/resolveRelation'

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
  const tagObjects = tags.filter(isResolvedRelation<Tag>)

  if (tagObjects.length === 0) return null

  return <div className="flex flex-wrap gap-2">{tagObjects.map(renderChip)}</div>
}
