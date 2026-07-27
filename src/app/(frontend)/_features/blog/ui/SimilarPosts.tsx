import { useTranslations } from 'next-intl'
import React from 'react'

import { BlogArchive } from './BlogArchive'
import { type BlogCardPost } from './BlogCard'

export const SimilarPosts: React.FC<{ posts: BlogCardPost[] }> = ({ posts }) => {
  const t = useTranslations('Blog')

  return (
    <section>
      <h2 className="mb-8 text-2xl font-semibold">{t('similarPosts')}</h2>
      <BlogArchive posts={posts} />
    </section>
  )
}
