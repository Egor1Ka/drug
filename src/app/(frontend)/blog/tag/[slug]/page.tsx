import type { Metadata } from 'next/types'

import { notFound } from 'next/navigation'

import { Show } from '@frontend/_shared/ui/Show'
import {
  BlogArchive,
  BlogListingLayout,
  Pagination,
  fetchPostsByTag,
  fetchTagBySlug,
} from '@frontend/_features/blog'

export const revalidate = 600

type Args = {
  params: Promise<{ slug?: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function TagPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const { slug = '' } = await paramsPromise
  const { page } = await searchParamsPromise
  const decodedSlug = decodeURIComponent(slug)
  const currentPage = Number(page || '1')

  if (!Number.isInteger(currentPage) || currentPage < 1) notFound()

  const tag = await fetchTagBySlug(decodedSlug)

  if (!tag) notFound()

  const posts = await fetchPostsByTag({ page: currentPage, slug: decodedSlug })

  return (
    <BlogListingLayout>
      <BlogListingLayout.Header>
        <p className="mb-2 text-sm text-muted-foreground">Posts tagged</p>
        <h1 className="text-4xl font-bold">{tag.title}</h1>
      </BlogListingLayout.Header>

      <BlogListingLayout.Content>
        <BlogArchive posts={posts.docs} />
        <Show when={posts.totalPages > 1 && posts.page}>
          <Pagination
            hrefPattern={`/blog/tag/${decodedSlug}?page={page}`}
            page={posts.page || 1}
            totalPages={posts.totalPages}
          />
        </Show>
      </BlogListingLayout.Content>
    </BlogListingLayout>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const tag = await fetchTagBySlug(decodedSlug)

  return {
    title: tag ? `Posts tagged ${tag.title} — Blog` : 'Blog',
  }
}
