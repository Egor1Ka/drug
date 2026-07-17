import type { Metadata } from 'next'

import { draftMode } from 'next/headers'
import React from 'react'

import type { Category, Post } from '@/payload-types'

import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import { Show } from '@frontend/_shared/ui/Show'
import {
  BlogPostLayout,
  Breadcrumbs,
  SimilarPosts,
  TagChips,
  fetchAllPostSlugs,
  fetchPostBySlug,
  fetchSimilarPosts,
  type Crumb,
} from '@frontend/_features/blog'
import { calculateReadTime } from '@/utilities/readTime'
import { formatBlogDate } from '@/utilities/formatBlogDate'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

const toSlugParam = ({ slug }: { slug?: string | null }) => ({ slug })

export async function generateStaticParams() {
  const slugs = await fetchAllPostSlugs()

  return slugs.map(toSlugParam)
}

const isCategoryObject = (category: Category | string): category is Category =>
  typeof category === 'object'

const buildCrumbs = (post: Post): Crumb[] => {
  const categories = (post.categories || []).filter(isCategoryObject)
  const firstCategory = categories[0]
  const categoryCrumbs = firstCategory
    ? [{ href: `/blog?category=${firstCategory.slug}`, label: firstCategory.title }]
    : []

  return [
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    ...categoryCrumbs,
    { label: post.title },
  ]
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = '/blog/' + decodedSlug
  const post = await fetchPostBySlug(decodedSlug)

  if (!post) return <PayloadRedirects url={url} />

  const readTime = calculateReadTime(post.content)
  const publishedDate = post.publishedAt ? formatBlogDate(post.publishedAt) : null
  const heroImage = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null
  const tags = post.tags || []
  const similarPosts = await fetchSimilarPosts(post)

  return (
    <BlogPostLayout>
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <Show when={draft}>
        <LivePreviewListener />
      </Show>

      <BlogPostLayout.Header>
        <Breadcrumbs crumbs={buildCrumbs(post)} />
        <h1 className="mt-6 text-3xl font-bold md:text-5xl">{post.title}</h1>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <Show when={publishedDate}>
            <time dateTime={post.publishedAt || undefined}>{publishedDate}</time>
          </Show>
          <span>{readTime} min read</span>
        </div>

        <Show when={tags.length > 0}>
          <div className="mt-4">
            <TagChips tags={tags} />
          </div>
        </Show>

        <Show when={heroImage}>
          <div className="mt-8 overflow-hidden rounded-lg">
            <Media imgClassName="w-full" priority resource={heroImage} />
          </div>
        </Show>
      </BlogPostLayout.Header>

      <BlogPostLayout.Content>
        <RichText className="mx-auto max-w-[48rem]" data={post.content} enableGutter={false} />
      </BlogPostLayout.Content>

      <Show when={similarPosts.length > 0}>
        <BlogPostLayout.Similar>
          <SimilarPosts posts={similarPosts} />
        </BlogPostLayout.Similar>
      </Show>
    </BlogPostLayout>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await fetchPostBySlug(decodedSlug)

  return generateMeta({ doc: post })
}
