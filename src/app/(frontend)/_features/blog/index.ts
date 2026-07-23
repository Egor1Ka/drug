// Public API of the blog feature — pages import ONLY from '@frontend/_features/blog'.

export { AuthorProfile } from './ui/AuthorProfile'
export { BlogArchive } from './ui/BlogArchive'
export { BlogCard, type BlogCardPost } from './ui/BlogCard'
export { BlogListingLayout } from './ui/BlogListingLayout'
export { BlogPostLayout } from './ui/BlogPostLayout'
export { Breadcrumbs, type Crumb } from './ui/Breadcrumbs'
export { CategoryTabs } from './ui/CategoryTabs'
export { PageRange } from './ui/PageRange'
export { Pagination } from './ui/Pagination'
export { SimilarPosts } from './ui/SimilarPosts'
export { TagChips } from './ui/TagChips'

export {
  POSTS_PER_PAGE,
  fetchAllPostSlugs,
  fetchPostBySlug,
  fetchPostsByAuthor,
  fetchPostsByTag,
  fetchPublishedPostsCount,
  fetchPublishedPostsPage,
  fetchSimilarPosts,
} from './api/posts'
export { fetchAllAuthorSlugs, fetchAuthorBySlug } from './api/authors'
export { fetchAllCategories } from './api/categories'
export { fetchTagBySlug } from './api/tags'
