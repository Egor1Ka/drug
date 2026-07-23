import type { Metadata } from 'next/types'

import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import type { AppLocale } from '@/i18n/routing'

import { Show } from '@frontend/_shared/ui/Show'
import {
  AuthorProfile,
  BlogArchive,
  BlogListingLayout,
  Pagination,
  fetchAuthorBySlug,
  fetchPostsByAuthor,
} from '@frontend/_features/blog'

export const revalidate = 600

type Args = {
  params: Promise<{ locale: AppLocale; slug?: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function AuthorPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const { locale, slug = '' } = await paramsPromise

  setRequestLocale(locale)

  const { page } = await searchParamsPromise
  const decodedSlug = decodeURIComponent(slug)
  const currentPage = Number(page || '1')

  if (!Number.isInteger(currentPage) || currentPage < 1) notFound()

  const author = await fetchAuthorBySlug(decodedSlug, locale)

  if (!author) notFound()

  const posts = await fetchPostsByAuthor({ locale, page: currentPage, slug: decodedSlug })

  return (
    <BlogListingLayout>
      <BlogListingLayout.Header>
        <AuthorProfile author={author} />
      </BlogListingLayout.Header>

      <BlogListingLayout.Content>
        <BlogArchive posts={posts.docs} />
        <Show when={posts.totalPages > 1 && posts.page}>
          <Pagination
            hrefPattern={`/blog/author/${decodedSlug}?page={page}`}
            page={posts.page || 1}
            totalPages={posts.totalPages}
          />
        </Show>
      </BlogListingLayout.Content>
    </BlogListingLayout>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale, slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const author = await fetchAuthorBySlug(decodedSlug, locale)

  if (!author) return { title: 'Blog' }

  const metaTitle = author.meta && author.meta.title ? author.meta.title : `${author.name} — Blog`
  const metaDescription =
    author.meta && author.meta.description ? author.meta.description : undefined

  return {
    title: metaTitle,
    description: metaDescription,
  }
}
