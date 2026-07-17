import React from 'react'

import { BlogArchive } from './BlogArchive'
import { type BlogCardPost } from './BlogCard'

export const SimilarPosts: React.FC<{ posts: BlogCardPost[] }> = ({ posts }) => (
  <section>
    <h2 className="mb-8 text-2xl font-semibold">Similar Posts</h2>
    <BlogArchive posts={posts} />
  </section>
)
