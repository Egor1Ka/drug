import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getNewsSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const results = await payload.find({
      collection: 'news',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const hasSlug = (item: { slug?: string | null }) => Boolean(item?.slug)

    const toSitemapEntry = (item: { slug?: string | null; updatedAt?: string | null }) => ({
      loc: `${SITE_URL}/news/${item?.slug}`,
      lastmod: item.updatedAt || dateFallback,
    })

    return results.docs ? results.docs.filter(hasSlug).map(toSitemapEntry) : []
  },
  ['news-sitemap'],
  {
    tags: ['news-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getNewsSitemap()

  return getServerSideSitemap(sitemap)
}
