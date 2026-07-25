import config from '@payload-config'
import { JSDOM } from 'jsdom'
import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'

// One-shot import of the original drug-card.io (WordPress) content into Payload:
//   - `news-updates`  → News collection
//   - `case-study`    → CaseStudies collection
//   - WP users        → Authors collection + relinks Posts.authors by post slug
//
// Reads the open WP REST API, so no WP credentials are needed. Idempotent:
// documents are matched by slug and existing ones are skipped, so re-running
// only fills gaps. Run with DRY_RUN=1 to log the plan without writing.
//
// Known limitations (fill manually in the admin afterwards):
//   - inline images inside article bodies are stripped (cover images ARE imported)
//   - only the `en` locale is imported; `uk` translations are added by editors
//   - case-study snapshot fields (region / products / result) are best-effort
//     parsed from the article HTML — review them after the run

const WP_BASE = 'https://drug-card.io/wp-json/wp/v2'
const DRY_RUN = process.env.DRY_RUN === '1'

// Manual fixes applied after heuristics; extend as needed.
const CLIENT_NAME_OVERRIDES: Record<string, string> = {}
const AUTHOR_NAME_OVERRIDES: Record<string, string> = { artem: 'Artem' }

type WpRendered = { rendered: string }

type WpYoast = {
  description?: string
  og_image?: { url: string }[]
  title?: string
}

type WpDocument = {
  author?: number
  content: WpRendered
  date_gmt: string
  slug: string
  title: WpRendered
  yoast_head_json?: WpYoast
}

type WpUser = { id: number; name: string; slug: string }

type EditorConfig = Awaited<ReturnType<typeof editorConfigFactory.default>>

// --- WP REST fetching -------------------------------------------------------

const fetchJson = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`WP request failed ${response.status}: ${url}`)
  return response.json()
}

const pageUrl = (restBase: string, page: number, fields?: string) => {
  const fieldsParam = fields ? `&_fields=${fields}` : ''
  return `${WP_BASE}/${restBase}?per_page=100&page=${page}${fieldsParam}`
}

const fetchAllPaged = async (restBase: string, fields?: string): Promise<WpDocument[]> => {
  const firstResponse = await fetch(pageUrl(restBase, 1, fields))
  if (!firstResponse.ok) throw new Error(`WP request failed ${firstResponse.status}: ${restBase}`)

  const totalPages = Number(firstResponse.headers.get('x-wp-totalpages') || '1')
  const firstPage = (await firstResponse.json()) as WpDocument[]

  const toNextPageNumber = (_: unknown, index: number) => index + 2
  const fetchPage = (page: number) => fetchJson(pageUrl(restBase, page, fields))
  const restPageNumbers = Array.from({ length: Math.max(totalPages - 1, 0) }, toNextPageNumber)
  const restPages = (await Promise.all(restPageNumbers.map(fetchPage))) as WpDocument[][]

  return [firstPage, ...restPages].flat()
}

// --- HTML helpers -----------------------------------------------------------

const decodeEntities = (html: string) => {
  const dom = new JSDOM(`<body>${html}</body>`)
  return (dom.window.document.body.textContent || '').trim()
}

const REMOVE_SELECTORS = [
  'img',
  'figure',
  'script',
  'style',
  'iframe',
  '.wp-block-spacer',
  '.wp-block-buttons',
]

const isFactsSidebar = (column: Element) => (column.textContent || '').trim().startsWith('Client:')

const cleanContentHtml = (html: string, { removeSidebar }: { removeSidebar: boolean }) => {
  const dom = new JSDOM(`<body>${html}</body>`)
  const document = dom.window.document

  const removeNode = (node: Element) => node.remove()
  const removeBySelector = (selector: string) =>
    Array.from(document.querySelectorAll(selector)).forEach(removeNode)

  if (removeSidebar) {
    const columns = Array.from(document.querySelectorAll('.wp-block-column'))
    columns.filter(isFactsSidebar).forEach(removeNode)
  }

  REMOVE_SELECTORS.forEach(removeBySelector)

  return document.body.innerHTML
}

const textContentOf = (html: string) => {
  const dom = new JSDOM(`<body>${html}</body>`)
  return (dom.window.document.body.textContent || '').replace(/\s+/g, ' ').trim()
}

// --- Case-study snapshot heuristics -----------------------------------------

const clientNameFromTitle = (slug: string, title: string) => {
  const override = CLIENT_NAME_OVERRIDES[slug]
  if (override) return override

  const beforeCaseStudy = title.match(/^(.*?)\s+Case Study/i)
  return beforeCaseStudy ? beforeCaseStudy[1].trim() : title
}

// The sidebar text collapses to "… Location: Europe Challenge …", so the value
// ends where the next fact-box heading begins.
const extractRegion = (text: string) => {
  const location = text.match(
    /Location:\s*(.+?)\s*(?:Challenge|Client|Products|Result|Solution|$)/,
  )
  return location && location[1] ? location[1].trim() : undefined
}

const extractProductCount = (text: string) => {
  const products = text.match(/(\d+)\s+products/i)
  return products ? Number(products[1]) : undefined
}

// Original titles read "<Client> Case Study: <headline result> with DrugCard";
// the subtitle is the most reliable source for the snapshot metric.
const extractResultMetric = (title: string) => {
  const colonIndex = title.indexOf(':')
  if (colonIndex === -1) return undefined

  const subtitle = title.slice(colonIndex + 1).trim()
  const withoutBrandSuffix = subtitle.replace(/\s+with DrugCard\s*$/i, '').trim()
  return withoutBrandSuffix || undefined
}

// --- Media upload (same pattern as enrich-home-content) ---------------------

const mimetypeFromUrl = (url: string) => {
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.webp')) return 'image/webp'
  if (url.endsWith('.svg')) return 'image/svg+xml'
  return 'image/jpeg'
}

const filenameFromUrl = (url: string) => url.split('/').slice(-1)[0].split('?')[0]

// WP og_image URLs often point at a resized variant ("...-1024x575.png") that
// may not exist anymore; the original file (suffix stripped) usually does.
const withoutSizeSuffix = (url: string) => url.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')

const fetchImageBuffer = async (url: string) => {
  const response = await fetch(url)
  if (response.ok) return Buffer.from(await response.arrayBuffer())

  const fallbackUrl = withoutSizeSuffix(url)
  if (fallbackUrl === url) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  const fallbackResponse = await fetch(fallbackUrl)
  if (!fallbackResponse.ok) {
    throw new Error(`Failed to fetch ${url} and ${fallbackUrl}: ${fallbackResponse.status}`)
  }
  return Buffer.from(await fallbackResponse.arrayBuffer())
}

const findExistingMediaId = async (payload: Payload, filename: string) => {
  const baseName = filename.split('.')[0]
  const result = await payload.find({
    collection: 'media',
    limit: 1,
    where: { filename: { contains: baseName } },
  })
  const existing = result.docs[0]
  return existing ? String(existing.id) : null
}

const createImageUploader =
  (payload: Payload) =>
  async ({ alt, url }: { alt: string; url: string }) => {
    const filename = filenameFromUrl(url)
    const existingId = await findExistingMediaId(payload, filename)
    if (existingId) return existingId
    if (DRY_RUN) {
      payload.logger.info(`[dry-run] would upload media ${filename}`)
      return null
    }

    try {
      const data = await fetchImageBuffer(url)
      const created = await payload.create({
        collection: 'media',
        data: { alt },
        file: { data, mimetype: mimetypeFromUrl(url), name: filename, size: data.length },
      })
      return String(created.id)
    } catch (uploadError) {
      // A missing cover must not sink the whole import — create the doc bare.
      payload.logger.warn(`Cover upload failed, continuing without it: ${String(uploadError)}`)
      return null
    }
  }

// --- Shared import plumbing -------------------------------------------------

type ImportableCollection = 'news' | 'case-studies'

const findIdBySlug = async (payload: Payload, collection: string, slug: string) => {
  const result = await payload.find({
    // Runtime-checked by Payload; keeps one helper for all slug lookups.
    collection: collection as ImportableCollection,
    draft: true,
    limit: 1,
    where: { slug: { equals: slug } },
  })
  const existing = result.docs[0]
  return existing ? String(existing.id) : null
}

const coverUrlOf = (item: WpDocument) => {
  const images = item.yoast_head_json ? item.yoast_head_json.og_image : undefined
  return images && images[0] ? images[0].url : undefined
}

const publishedAtOf = (item: WpDocument) => new Date(`${item.date_gmt}Z`).toISOString()

const buildSeoMeta = (item: WpDocument, coverId: string | null) => ({
  title: item.yoast_head_json?.title ? decodeEntities(item.yoast_head_json.title) : undefined,
  description: item.yoast_head_json?.description,
  image: coverId || undefined,
})

// --- News -------------------------------------------------------------------

const importNewsItem =
  (payload: Payload, editorConfig: EditorConfig) => async (item: WpDocument) => {
    const existingId = await findIdBySlug(payload, 'news', item.slug)
    if (existingId) {
      payload.logger.info(`news "${item.slug}" already exists — skipped`)
      return 'skipped'
    }

    const title = decodeEntities(item.title.rendered)
    const coverUrl = coverUrlOf(item)
    const uploadImage = createImageUploader(payload)
    const coverId = coverUrl ? await uploadImage({ alt: title, url: coverUrl }) : null

    if (DRY_RUN) {
      payload.logger.info(`[dry-run] would create news "${item.slug}"`)
      return 'created'
    }

    const content = convertHTMLToLexical({
      editorConfig,
      html: cleanContentHtml(item.content.rendered, { removeSidebar: false }),
      JSDOM,
    })

    await payload.create({
      collection: 'news',
      context: { disableRevalidate: true },
      locale: 'en',
      data: {
        title,
        slug: item.slug,
        excerpt: item.yoast_head_json?.description,
        content,
        coverImage: coverId || undefined,
        publishedAt: publishedAtOf(item),
        meta: buildSeoMeta(item, coverId),
        _status: 'published',
      } as RequiredDataFromCollectionSlug<'news'>,
    })

    payload.logger.info(`Created news "${item.slug}"`)
    return 'created'
  }

// --- Case studies -----------------------------------------------------------

const importCaseStudy =
  (payload: Payload, editorConfig: EditorConfig) => async (item: WpDocument) => {
    const existingId = await findIdBySlug(payload, 'case-studies', item.slug)
    if (existingId) {
      payload.logger.info(`case study "${item.slug}" already exists — skipped`)
      return 'skipped'
    }

    const title = decodeEntities(item.title.rendered)
    const fullText = textContentOf(item.content.rendered)
    const coverUrl = coverUrlOf(item)
    const uploadImage = createImageUploader(payload)
    const coverId = coverUrl ? await uploadImage({ alt: title, url: coverUrl }) : null

    if (DRY_RUN) {
      payload.logger.info(
        `[dry-run] would create case study "${item.slug}" ` +
          `(client: ${clientNameFromTitle(item.slug, title)}, region: ${extractRegion(fullText)})`,
      )
      return 'created'
    }

    const content = convertHTMLToLexical({
      editorConfig,
      html: cleanContentHtml(item.content.rendered, { removeSidebar: true }),
      JSDOM,
    })

    await payload.create({
      collection: 'case-studies',
      context: { disableRevalidate: true },
      locale: 'en',
      data: {
        title,
        slug: item.slug,
        clientName: clientNameFromTitle(item.slug, title),
        region: extractRegion(fullText),
        productCount: extractProductCount(fullText),
        resultMetric: extractResultMetric(title),
        excerpt: item.yoast_head_json?.description,
        content,
        coverImage: coverId || undefined,
        publishedAt: publishedAtOf(item),
        meta: buildSeoMeta(item, coverId),
        _status: 'published',
      } as RequiredDataFromCollectionSlug<'case-studies'>,
    })

    payload.logger.info(`Created case study "${item.slug}"`)
    return 'created'
  }

// --- Authors ----------------------------------------------------------------

const ensureAuthor = (payload: Payload) => async (user: WpUser) => {
  const existing = await payload.find({
    collection: 'authors',
    limit: 1,
    where: { slug: { equals: user.slug } },
  })

  const existingAuthor = existing.docs[0]
  if (existingAuthor) return [user.id, String(existingAuthor.id)] as const

  if (DRY_RUN) {
    payload.logger.info(`[dry-run] would create author "${user.slug}"`)
    // Fake id keeps the post-linking simulation meaningful in dry-run mode.
    return [user.id, `dry-${user.slug}`] as const
  }

  const created = await payload.create({
    collection: 'authors',
    context: { disableRevalidate: true },
    data: {
      name: AUTHOR_NAME_OVERRIDES[user.slug] || user.name,
      slug: user.slug,
    } as RequiredDataFromCollectionSlug<'authors'>,
  })

  payload.logger.info(`Created author "${user.slug}"`)
  return [user.id, String(created.id)] as const
}

const buildAuthorMap = async (payload: Payload, users: WpUser[], wpPosts: WpDocument[]) => {
  const authoringIds = new Set(wpPosts.map((post: WpDocument) => post.author).filter(Boolean))
  const isAuthoringUser = (user: WpUser) => authoringIds.has(user.id)

  const entries = await Promise.all(users.filter(isAuthoringUser).map(ensureAuthor(payload)))

  return new Map(entries.filter(Boolean) as (readonly [number, string])[])
}

const linkPostAuthor =
  (payload: Payload, wpUserToAuthor: Map<number, string>) => async (wpPost: WpDocument) => {
    const authorId = wpPost.author ? wpUserToAuthor.get(wpPost.author) : undefined
    if (!authorId) return 'no-author'

    const result = await payload.find({
      collection: 'posts',
      depth: 0,
      draft: true,
      limit: 1,
      select: { authors: true },
      where: { slug: { equals: wpPost.slug } },
    })

    const post = result.docs[0]
    if (!post) {
      payload.logger.warn(`Post "${wpPost.slug}" not found in Payload — skipped`)
      return 'missing'
    }

    const currentAuthors = post.authors || []
    if (currentAuthors.length > 0) return 'already-linked'

    if (DRY_RUN) {
      payload.logger.info(`[dry-run] would link post "${wpPost.slug}" → author ${authorId}`)
      return 'linked'
    }

    await payload.update({
      collection: 'posts',
      context: { disableRevalidate: true },
      data: { authors: [authorId] },
      id: post.id,
    })

    return 'linked'
  }

// --- Entry point ------------------------------------------------------------

const countBy = (results: string[]) => {
  const addToTally = (tally: Record<string, number>, key: string) => ({
    ...tally,
    [key]: (tally[key] || 0) + 1,
  })
  return results.reduce(addToTally, {})
}

const importWpContent = async () => {
  const payload = await getPayload({ config })
  const editorConfig = await editorConfigFactory.default({ config: payload.config })

  payload.logger.info(`Fetching content from ${WP_BASE} ${DRY_RUN ? '(DRY RUN)' : ''}`)

  const [newsItems, caseStudies, wpPosts, users] = await Promise.all([
    fetchAllPaged('news-updates'),
    fetchAllPaged('case-study'),
    fetchAllPaged('posts', 'slug,author'),
    fetchAllPaged('users', 'id,name,slug') as Promise<unknown> as Promise<WpUser[]>,
  ])

  payload.logger.info(
    `Fetched: ${newsItems.length} news, ${caseStudies.length} case studies, ` +
      `${wpPosts.length} posts, ${users.length} users`,
  )

  const newsResults = await Promise.all(newsItems.map(importNewsItem(payload, editorConfig)))
  payload.logger.info(`News: ${JSON.stringify(countBy(newsResults))}`)

  const caseStudyResults = await Promise.all(
    caseStudies.map(importCaseStudy(payload, editorConfig)),
  )
  payload.logger.info(`Case studies: ${JSON.stringify(countBy(caseStudyResults))}`)

  const wpUserToAuthor = await buildAuthorMap(payload, users, wpPosts)
  const linkResults = await Promise.all(wpPosts.map(linkPostAuthor(payload, wpUserToAuthor)))
  payload.logger.info(`Post → author links: ${JSON.stringify(countBy(linkResults))}`)

  payload.logger.info('WP content import complete')
}

await importWpContent()
process.exit(0)
