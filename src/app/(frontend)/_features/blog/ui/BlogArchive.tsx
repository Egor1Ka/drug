import React from 'react'

import { BlogCard, type BlogCardPost } from './BlogCard'

const renderPost = (post: BlogCardPost) => <BlogCard key={post.slug} post={post} />

export const BlogArchive: React.FC<{ posts: BlogCardPost[] }> = ({ posts }) => (
  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">{posts.map(renderPost)}</div>
)
