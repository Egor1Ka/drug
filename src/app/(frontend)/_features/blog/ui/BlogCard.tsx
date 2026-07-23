import Link from 'next/link'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatBlogDate } from '@/utilities/formatBlogDate'

export type BlogCardPost = Pick<
  Post,
  'slug' | 'title' | 'heroImage' | 'meta' | 'publishedAt' | 'populatedAuthors'
>

type PopulatedAuthor = NonNullable<NonNullable<Post['populatedAuthors']>[number]>

const hasName = (author: PopulatedAuthor) => Boolean(author.name)

const AuthorName: React.FC<{ author: PopulatedAuthor }> = ({ author }) => {
  if (!author.slug) return <span>{author.name}</span>

  return (
    <Link href={`/blog/author/${author.slug}`} className="hover:text-primary">
      {author.name}
    </Link>
  )
}

const AuthorByline: React.FC<{ authors: PopulatedAuthor[] }> = ({ authors }) => {
  const namedAuthors = authors.filter(hasName)

  if (namedAuthors.length === 0) return null

  const renderAuthor = (author: PopulatedAuthor, index: number) => (
    <React.Fragment key={author.id || author.name}>
      {index > 0 && ', '}
      <AuthorName author={author} />
    </React.Fragment>
  )

  return <span>{namedAuthors.map(renderAuthor)}</span>
}

export const BlogCard: React.FC<{ post: BlogCardPost }> = ({ post }) => {
  const { heroImage, meta, populatedAuthors, publishedAt, slug, title } = post

  const heroImageObject = heroImage && typeof heroImage === 'object' ? heroImage : null
  const metaImageObject = meta && meta.image && typeof meta.image === 'object' ? meta.image : null
  const image = heroImageObject || metaImageObject
  const href = `/blog/${slug}`

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Link href={href} className="relative block aspect-[3/2] overflow-hidden bg-muted">
        {image && <Media fill imgClassName="object-cover" resource={image} size="33vw" />}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {publishedAt && <time dateTime={publishedAt}>{formatBlogDate(publishedAt)}</time>}
          <AuthorByline authors={populatedAuthors || []} />
        </div>
        <h2 className="text-xl font-semibold leading-snug">
          <Link href={href} className="hover:text-primary">
            {title}
          </Link>
        </h2>
        <div className="mt-auto pt-2">
          <Link
            href={href}
            className="inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Learn more
          </Link>
        </div>
      </div>
    </article>
  )
}
