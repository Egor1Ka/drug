import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getAuthorsSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const results = await payload.find({
      collection: 'authors',
      overrideAccess: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const hasSlug = (author: { slug?: string | null }) => Boolean(author?.slug)

    const toSitemapEntry = (author: { slug?: string | null; updatedAt?: string | null }) => ({
      loc: `${SITE_URL}/blog/author/${author?.slug}`,
      lastmod: author.updatedAt || dateFallback,
    })

    return results.docs ? results.docs.filter(hasSlug).map(toSitemapEntry) : []
  },
  ['authors-sitemap'],
  {
    tags: ['authors-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getAuthorsSitemap()

  return getServerSideSitemap(sitemap)
}
