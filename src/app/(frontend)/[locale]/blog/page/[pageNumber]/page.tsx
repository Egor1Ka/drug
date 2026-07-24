import type { Metadata } from 'next/types'

import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import React from 'react'

import type { AppLocale } from '@/i18n/routing'

import { Show } from '@frontend/_shared/ui/Show'
import {
  BlogArchive,
  BlogListingLayout,
  CategoryTabs,
  PageRange,
  Pagination,
  POSTS_PER_PAGE,
  fetchAllCategories,
  fetchPublishedPostsCount,
  fetchPublishedPostsPage,
} from '@frontend/_features/blog'
import PageClient from './page.client'

export const revalidate = 600

type Args = {
  params: Promise<{ locale: AppLocale; pageNumber: string }>
}

const toPageParam = (_: unknown, index: number): { pageNumber: string } => ({
  pageNumber: String(index + 1),
})

export default async function Page({ params: paramsPromise }: Args) {
  const { locale, pageNumber } = await paramsPromise

  setRequestLocale(locale)

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber) || sanitizedPageNumber < 1) notFound()

  const [posts, categories] = await Promise.all([
    fetchPublishedPostsPage({ locale, page: sanitizedPageNumber }),
    fetchAllCategories(locale),
  ])

  return (
    <BlogListingLayout>
      <PageClient />

      <BlogListingLayout.Header>
        <h1 className="text-4xl font-bold">Blog</h1>
      </BlogListingLayout.Header>

      <BlogListingLayout.Tabs>
        <CategoryTabs categories={categories} />
      </BlogListingLayout.Tabs>

      <BlogListingLayout.Meta>
        <PageRange
          currentPage={posts.page}
          limit={POSTS_PER_PAGE}
          totalDocs={posts.totalDocs}
        />
      </BlogListingLayout.Meta>

      <BlogListingLayout.Content>
        <BlogArchive posts={posts.docs} />
        <Show when={posts.totalPages > 1 && posts.page}>
          <Pagination page={posts.page || 1} totalPages={posts.totalPages} />
        </Show>
      </BlogListingLayout.Content>
    </BlogListingLayout>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  return {
    title: `Blog — Page ${pageNumber || ''}`,
  }
}

export async function generateStaticParams() {
  const totalDocs = await fetchPublishedPostsCount()
  const totalPages = Math.ceil(totalDocs / POSTS_PER_PAGE)

  return Array.from({ length: totalPages }, toPageParam)
}
