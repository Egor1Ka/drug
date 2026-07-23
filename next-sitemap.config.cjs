const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://example.com'

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: ['/posts-sitemap.xml', '/authors-sitemap.xml', '/news-sitemap.xml', '/case-studies-sitemap.xml', '/*', '/blog/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        disallow: '/admin/*',
      },
    ],
    additionalSitemaps: [
      `${SITE_URL}/posts-sitemap.xml`,
      `${SITE_URL}/authors-sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
      `${SITE_URL}/case-studies-sitemap.xml`,
    ],
  },
}
