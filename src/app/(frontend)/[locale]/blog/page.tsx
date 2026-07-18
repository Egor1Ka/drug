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
  fetchPublishedPostsPage,
} from '@frontend/_features/blog'
import PageClient from './page.client'

export const revalidate = 600

type Args = {
  params: Promise<{ locale: AppLocale }>
  searchParams: Promise<{ category?: string; page?: string }>
}

const listingHrefPattern = (category?: string): string =>
  category ? `/blog?category=${category}&page={page}` : '/blog/page/{page}'

export default async function Page({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const { locale } = await paramsPromise

  setRequestLocale(locale)

  const { category, page } = await searchParamsPromise
  const currentPage = Number(page || '1')

  if (!Number.isInteger(currentPage) || currentPage < 1) notFound()

  const [posts, categories] = await Promise.all([
    fetchPublishedPostsPage({ category, locale, page: currentPage }),
    fetchAllCategories(locale),
  ])

  return (
    <BlogListingLayout>
      <PageClient />

      <BlogListingLayout.Header>
        <h1 className="text-4xl font-bold">Blog</h1>
      </BlogListingLayout.Header>

      <BlogListingLayout.Tabs>
        <CategoryTabs activeSlug={category} categories={categories} />
      </BlogListingLayout.Tabs>

      <BlogListingLayout.Meta>
        <PageRange
          collection="posts"
          currentPage={posts.page}
          limit={POSTS_PER_PAGE}
          totalDocs={posts.totalDocs}
        />
      </BlogListingLayout.Meta>

      <BlogListingLayout.Content>
        <BlogArchive posts={posts.docs} />
        <Show when={posts.totalPages > 1 && posts.page}>
          <Pagination
            hrefPattern={listingHrefPattern(category)}
            page={posts.page || 1}
            totalPages={posts.totalPages}
          />
        </Show>
      </BlogListingLayout.Content>
    </BlogListingLayout>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Blog',
  }
}
