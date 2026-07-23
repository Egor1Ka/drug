// Public API of the news feature — pages import ONLY from '@frontend/_features/news'.

export { NewsArchive } from './ui/NewsArchive'
export { NewsCard, type NewsCardItem } from './ui/NewsCard'
export { NewsListingLayout } from './ui/NewsListingLayout'
export { NewsPostLayout } from './ui/NewsPostLayout'

export {
  NEWS_PER_PAGE,
  fetchAllNewsSlugs,
  fetchNewsBySlug,
  fetchPublishedNewsPage,
} from './api/news'
