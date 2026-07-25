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
// FORCE_CONTENT=1 rewrites `content` (and missing covers) of EXISTING docs —
// use after improving the HTML conversion to refresh already-imported bodies.
const FORCE_CONTENT = process.env.FORCE_CONTENT === '1'

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
  categories?: number[]
  content: WpRendered
  date_gmt: string
  slug: string
  tags?: number[]
  title: WpRendered
  yoast_head_json?: WpYoast
}

type WpUser = { id: number; name: string; slug: string }

type WpTerm = { count: number; id: number; name: string; slug: string }

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

const REMOVE_SELECTORS = ['script', 'style', '.wp-block-spacer', '.wp-block-buttons']

const isFactsSidebar = (column: Element) => (column.textContent || '').trim().startsWith('Client:')

type InlineAsset = { alt: string; kind: 'image' | 'video'; url: string }

const ASSET_MARKER_PATTERN = /^@@wp-asset:(\d+)@@$/

// Replaces every inline <img>/<iframe> with a marker paragraph and records the
// asset, so the converted Lexical tree can be patched with real upload/video
// nodes at the exact positions the original article had them.
const prepareContentHtml = (html: string, { removeSidebar }: { removeSidebar: boolean }) => {
  const dom = new JSDOM(`<body>${html}</body>`)
  const document = dom.window.document
  const assets: InlineAsset[] = []

  const removeNode = (node: Element) => node.remove()
  const removeBySelector = (selector: string) =>
    Array.from(document.querySelectorAll(selector)).forEach(removeNode)

  const sidebarColumns = removeSidebar
    ? Array.from(document.querySelectorAll('.wp-block-column')).filter(isFactsSidebar)
    : []
  // The facts sidebar holds the client logo — capture it for `clientLogo`
  // before the whole column is dropped from the article body.
  const sidebarImage = sidebarColumns[0] ? sidebarColumns[0].querySelector('img') : null
  const sidebarImageUrl = sidebarImage ? sidebarImage.getAttribute('src') || null : null
  sidebarColumns.forEach(removeNode)

  REMOVE_SELECTORS.forEach(removeBySelector)

  const replaceWithMarker = (element: Element, asset: InlineAsset) => {
    const marker = document.createElement('p')
    marker.textContent = `@@wp-asset:${assets.length}@@`
    assets.push(asset)
    const wrapper = element.closest('figure') || element
    wrapper.replaceWith(marker)
  }

  const markImage = (image: Element) => {
    const url = image.getAttribute('src')
    if (!url) return removeNode(image)
    replaceWithMarker(image, { alt: image.getAttribute('alt') || '', kind: 'image', url })
  }

  const markVideo = (frame: Element) => {
    const url = frame.getAttribute('src') || ''
    const isYouTube = url.includes('youtube') || url.includes('youtu.be')
    if (!isYouTube) return removeNode(frame)
    replaceWithMarker(frame, { alt: '', kind: 'video', url })
  }

  Array.from(document.querySelectorAll('img')).forEach(markImage)
  Array.from(document.querySelectorAll('iframe')).forEach(markVideo)

  return { assets, html: document.body.innerHTML, sidebarImageUrl }
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

// WP og_image URLs often point at a resized variant ("...-1024x575.png",
// "...-scaled.jpg") that may not exist anymore; the original file (suffix
// stripped) usually does.
const withoutSizeSuffix = (url: string) =>
  url.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1').replace(/-scaled(\.[a-z]+)$/i, '$1')

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
  const result = await payload.find({
    collection: 'media',
    limit: 1,
    // Exact match: WP reuses generic names ("image.jpg") across months, so a
    // fuzzy `contains` lookup would wrongly dedupe distinct pictures.
    where: { filename: { equals: filename } },
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

    const createMediaDocument = async () => {
      const data = await fetchImageBuffer(url)
      const created = await payload.create({
        collection: 'media',
        data: { alt },
        file: { data, mimetype: mimetypeFromUrl(url), name: filename, size: data.length },
      })
      return String(created.id)
    }

    try {
      return await createMediaDocument()
    } catch (firstError) {
      // Mongo Atlas occasionally aborts the media transaction ("Please retry
      // your operation") — one delayed retry clears it.
      payload.logger.warn(`Cover upload failed, retrying once: ${String(firstError)}`)
      await new Promise(scheduleRetryDelay)
      try {
        return await createMediaDocument()
      } catch (retryError) {
        // A missing cover must not sink the whole import — create the doc bare.
        payload.logger.warn(`Cover upload failed again, continuing without it: ${String(retryError)}`)
        return null
      }
    }
  }

const scheduleRetryDelay = (resolve: (value: unknown) => void) => {
  setTimeout(resolve, 1500)
}

// --- Shared import plumbing -------------------------------------------------

type ImportableCollection = 'case-studies' | 'news' | 'posts'

// News and case studies show the cover via `coverImage`; blog posts via `heroImage`.
const COVER_FIELD: Record<ImportableCollection, 'coverImage' | 'heroImage'> = {
  'case-studies': 'coverImage',
  news: 'coverImage',
  posts: 'heroImage',
}

type ExistingDocument = { id: string; hasCover: boolean }

const findExistingBySlug = async (
  payload: Payload,
  collection: ImportableCollection,
  slug: string,
): Promise<ExistingDocument | null> => {
  const coverField = COVER_FIELD[collection]

  const result = await payload.find({
    collection,
    depth: 0,
    draft: true,
    limit: 1,
    select: { [coverField]: true },
    where: { slug: { equals: slug } },
  })
  const existing = result.docs[0] as unknown as Record<string, unknown> | undefined
  if (!existing) return null
  return { id: String(existing.id), hasCover: Boolean(existing[coverField]) }
}

// A previous run may have created the doc while its cover upload hit a
// transient DB error — re-runs patch the missing cover instead of skipping.
const backfillCover = async (
  payload: Payload,
  collection: ImportableCollection,
  existing: ExistingDocument,
  slug: string,
  coverId: string | null,
) => {
  if (existing.hasCover || !coverId) {
    payload.logger.info(`${collection} "${slug}" already exists — skipped`)
    return 'skipped'
  }

  if (DRY_RUN) {
    payload.logger.info(`[dry-run] would backfill cover for ${collection} "${slug}"`)
    return 'cover-backfilled'
  }

  await payload.update({
    collection,
    context: { disableRevalidate: true },
    data: { [COVER_FIELD[collection]]: coverId, meta: { image: coverId } },
    id: existing.id,
  })

  payload.logger.info(`Backfilled cover for ${collection} "${slug}"`)
  return 'cover-backfilled'
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

// --- Lexical tree patching (inline images / videos) --------------------------

type LexicalNode = { children?: LexicalNode[]; text?: string; type?: string; [key: string]: unknown }

const textOfChild = (child: LexicalNode) => (typeof child.text === 'string' ? child.text : '')

const markerIndexOf = (node: LexicalNode) => {
  if (node.type !== 'paragraph' || !Array.isArray(node.children)) return null
  const match = node.children.map(textOfChild).join('').trim().match(ASSET_MARKER_PATTERN)
  return match ? Number(match[1]) : null
}

const buildUploadNode = (mediaId: string): LexicalNode => ({
  type: 'upload',
  fields: null,
  format: '',
  relationTo: 'media',
  value: mediaId,
  version: 3,
})

const buildVideoBlockNode = (videoUrl: string, index: number): LexicalNode => ({
  type: 'block',
  fields: {
    id: `wpvideo${index}`,
    blockName: '',
    blockType: 'videoEmbed',
    videoUrl,
  },
  format: '',
  version: 2,
})

const replaceMarkerNodes = (
  nodes: LexicalNode[],
  toReplacement: (index: number) => LexicalNode | null,
): LexicalNode[] => {
  const replaceNode = (node: LexicalNode): LexicalNode | null => {
    const markerIndex = markerIndexOf(node)
    if (markerIndex !== null) return toReplacement(markerIndex)
    if (!Array.isArray(node.children)) return node
    return { ...node, children: replaceMarkerNodes(node.children, toReplacement) }
  }

  const isKeptNode = (node: LexicalNode | null): node is LexicalNode => node !== null

  return nodes.map(replaceNode).filter(isKeptNode)
}

const buildRichTextContent = async (
  payload: Payload,
  editorConfig: EditorConfig,
  item: WpDocument,
  { coverUrl, removeSidebar }: { coverUrl?: string; removeSidebar: boolean },
) => {
  const prepared = prepareContentHtml(item.content.rendered, { removeSidebar })
  const uploadImage = createImageUploader(payload)
  const coverFilename = coverUrl ? filenameFromUrl(withoutSizeSuffix(coverUrl)) : null

  const uploadInlineAsset = async (asset: InlineAsset) => {
    if (asset.kind !== 'image') return null
    // The cover already renders above the article — skip its inline duplicate.
    const assetFilename = filenameFromUrl(withoutSizeSuffix(asset.url))
    if (coverFilename && assetFilename === coverFilename) return null
    return uploadImage({ alt: asset.alt, url: asset.url })
  }

  const uploadedIds = await Promise.all(prepared.assets.map(uploadInlineAsset))

  const state = convertHTMLToLexical({
    editorConfig,
    html: prepared.html,
    JSDOM,
  }) as unknown as { root: { children: LexicalNode[] } & Record<string, unknown> }

  const toReplacement = (index: number) => {
    const asset = prepared.assets[index]
    if (!asset) return null
    if (asset.kind === 'video') return buildVideoBlockNode(asset.url, index)
    const mediaId = uploadedIds[index]
    return mediaId ? buildUploadNode(mediaId) : null
  }

  const content = {
    ...state,
    root: { ...state.root, children: replaceMarkerNodes(state.root.children, toReplacement) },
  }

  return { content, sidebarImageUrl: prepared.sidebarImageUrl }
}

// --- News -------------------------------------------------------------------

const importNewsItem =
  (payload: Payload, editorConfig: EditorConfig) => async (item: WpDocument) => {
    const existing = await findExistingBySlug(payload, 'news', item.slug)

    const title = decodeEntities(item.title.rendered)
    const coverUrl = coverUrlOf(item)
    const needsCover = !existing || !existing.hasCover
    const uploadImage = createImageUploader(payload)
    const coverId = coverUrl && needsCover ? await uploadImage({ alt: title, url: coverUrl }) : null

    if (existing && !FORCE_CONTENT) {
      return backfillCover(payload, 'news', existing, item.slug, coverId)
    }

    if (DRY_RUN) {
      const action = existing ? 'update content of' : 'create'
      payload.logger.info(`[dry-run] would ${action} news "${item.slug}"`)
      return existing ? 'content-updated' : 'created'
    }

    const { content } = await buildRichTextContent(payload, editorConfig, item, {
      coverUrl: coverUrl || undefined,
      removeSidebar: false,
    })

    if (existing) {
      await payload.update({
        collection: 'news',
        context: { disableRevalidate: true },
        id: existing.id,
        locale: 'en',
        data: {
          content,
          ...(coverId ? { coverImage: coverId, meta: { image: coverId } } : {}),
        } as RequiredDataFromCollectionSlug<'news'>,
      })
      payload.logger.info(`Updated content of news "${item.slug}"`)
      return 'content-updated'
    }

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
    const existing = await findExistingBySlug(payload, 'case-studies', item.slug)

    const title = decodeEntities(item.title.rendered)
    const fullText = textContentOf(item.content.rendered)
    const coverUrl = coverUrlOf(item)
    const needsCover = !existing || !existing.hasCover
    const uploadImage = createImageUploader(payload)
    const coverId = coverUrl && needsCover ? await uploadImage({ alt: title, url: coverUrl }) : null

    if (existing && !FORCE_CONTENT) {
      return backfillCover(payload, 'case-studies', existing, item.slug, coverId)
    }

    if (DRY_RUN) {
      const action = existing ? 'update content of' : 'create'
      payload.logger.info(
        `[dry-run] would ${action} case study "${item.slug}" ` +
          `(client: ${clientNameFromTitle(item.slug, title)}, region: ${extractRegion(fullText)})`,
      )
      return existing ? 'content-updated' : 'created'
    }

    const { content, sidebarImageUrl } = await buildRichTextContent(payload, editorConfig, item, {
      coverUrl: coverUrl || undefined,
      removeSidebar: true,
    })

    const clientName = clientNameFromTitle(item.slug, title)
    const clientLogoId = sidebarImageUrl
      ? await uploadImage({ alt: `${clientName} logo`, url: sidebarImageUrl })
      : null

    if (existing) {
      await payload.update({
        collection: 'case-studies',
        context: { disableRevalidate: true },
        id: existing.id,
        locale: 'en',
        data: {
          content,
          ...(clientLogoId ? { clientLogo: clientLogoId } : {}),
          ...(coverId ? { coverImage: coverId, meta: { image: coverId } } : {}),
        } as RequiredDataFromCollectionSlug<'case-studies'>,
      })
      payload.logger.info(`Updated content of case study "${item.slug}"`)
      return 'content-updated'
    }

    await payload.create({
      collection: 'case-studies',
      context: { disableRevalidate: true },
      locale: 'en',
      data: {
        title,
        slug: item.slug,
        clientName,
        clientLogo: clientLogoId || undefined,
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

// --- Categories & Tags -------------------------------------------------------

type TaxonomyCollection = 'categories' | 'tags'

const hasPosts = (term: WpTerm) => term.count > 0

const ensureTaxonomyDoc =
  (payload: Payload, collection: TaxonomyCollection) => async (term: WpTerm) => {
    const existing = await payload.find({
      collection,
      limit: 1,
      where: { slug: { equals: term.slug } },
    })

    const existingDoc = existing.docs[0]
    if (existingDoc) return [term.id, String(existingDoc.id)] as const

    if (DRY_RUN) {
      payload.logger.info(`[dry-run] would create ${collection} "${term.slug}"`)
      return [term.id, `dry-${term.slug}`] as const
    }

    const created = await payload.create({
      collection,
      context: { disableRevalidate: true },
      locale: 'en',
      data: {
        title: decodeEntities(term.name),
        slug: term.slug,
      } as RequiredDataFromCollectionSlug<TaxonomyCollection>,
    })

    payload.logger.info(`Created ${collection} "${term.slug}"`)
    return [term.id, String(created.id)] as const
  }

// Only terms actually used by posts — WP holds stale/duplicate empty terms.
const buildTaxonomyMap = async (
  payload: Payload,
  collection: TaxonomyCollection,
  terms: WpTerm[],
) => {
  const entries = await Promise.all(terms.filter(hasPosts).map(ensureTaxonomyDoc(payload, collection)))
  return new Map(entries)
}

// --- Blog posts ---------------------------------------------------------------

type PostRelationMaps = {
  authors: Map<number, string>
  categories: Map<number, string>
  tags: Map<number, string>
}

const importPost =
  (payload: Payload, editorConfig: EditorConfig, maps: PostRelationMaps) =>
  async (item: WpDocument) => {
    const existing = await findExistingBySlug(payload, 'posts', item.slug)

    const title = decodeEntities(item.title.rendered)
    const coverUrl = coverUrlOf(item)
    const needsCover = !existing || !existing.hasCover
    const uploadImage = createImageUploader(payload)
    const coverId = coverUrl && needsCover ? await uploadImage({ alt: title, url: coverUrl }) : null

    if (existing && !FORCE_CONTENT) {
      return backfillCover(payload, 'posts', existing, item.slug, coverId)
    }

    if (DRY_RUN) {
      const action = existing ? 'update content of' : 'create'
      payload.logger.info(`[dry-run] would ${action} post "${item.slug}"`)
      return existing ? 'content-updated' : 'created'
    }

    const { content } = await buildRichTextContent(payload, editorConfig, item, {
      coverUrl: coverUrl || undefined,
      removeSidebar: false,
    })

    if (existing) {
      await payload.update({
        collection: 'posts',
        context: { disableRevalidate: true },
        id: existing.id,
        locale: 'en',
        data: {
          content,
          ...(coverId ? { heroImage: coverId, meta: { image: coverId } } : {}),
        } as RequiredDataFromCollectionSlug<'posts'>,
      })
      payload.logger.info(`Updated content of post "${item.slug}"`)
      return 'content-updated'
    }

    const toMappedId = (map: Map<number, string>) => (wpId: number) => map.get(wpId)
    const categoryIds = (item.categories || []).map(toMappedId(maps.categories)).filter(Boolean) as string[]
    const tagIds = (item.tags || []).map(toMappedId(maps.tags)).filter(Boolean) as string[]
    const authorId = item.author ? maps.authors.get(item.author) : undefined

    await payload.create({
      collection: 'posts',
      context: { disableRevalidate: true },
      locale: 'en',
      data: {
        title,
        slug: item.slug,
        content,
        heroImage: coverId || undefined,
        categories: categoryIds,
        tags: tagIds,
        authors: authorId ? [authorId] : undefined,
        publishedAt: publishedAtOf(item),
        meta: buildSeoMeta(item, coverId),
        _status: 'published',
      } as RequiredDataFromCollectionSlug<'posts'>,
    })

    payload.logger.info(`Created post "${item.slug}"`)
    return 'created'
  }

// 194 posts × cover + inline images: chunked batches keep WP and the DB from
// being hammered by 200 concurrent downloads.
const POSTS_BATCH_SIZE = 8

const chunkItems = <T,>(items: T[], size: number): T[][] => {
  const addToChunks = (chunks: T[][], item: T, index: number): T[][] => {
    if (index % size === 0) return [...chunks, [item]]
    const lastChunk = chunks[chunks.length - 1]
    return [...chunks.slice(0, -1), [...lastChunk, item]]
  }
  return items.reduce(addToChunks, [])
}

const importPostsInBatches = async (
  payload: Payload,
  editorConfig: EditorConfig,
  maps: PostRelationMaps,
  wpPosts: WpDocument[],
) => {
  const importOne = importPost(payload, editorConfig, maps)

  const runBatch = async (previous: Promise<string[]>, batch: WpDocument[]) => {
    const finished = await previous
    const batchResults = await Promise.all(batch.map(importOne))
    return [...finished, ...batchResults]
  }

  return chunkItems(wpPosts, POSTS_BATCH_SIZE).reduce(runBatch, Promise.resolve([] as string[]))
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

  const [newsItems, caseStudies, wpPosts, users, wpCategories, wpTags] = await Promise.all([
    fetchAllPaged('news-updates'),
    fetchAllPaged('case-study'),
    fetchAllPaged('posts'),
    fetchAllPaged('users', 'id,name,slug') as Promise<unknown> as Promise<WpUser[]>,
    fetchAllPaged('categories', 'id,name,slug,count') as Promise<unknown> as Promise<WpTerm[]>,
    fetchAllPaged('tags', 'id,name,slug,count') as Promise<unknown> as Promise<WpTerm[]>,
  ])

  payload.logger.info(
    `Fetched: ${newsItems.length} news, ${caseStudies.length} case studies, ` +
      `${wpPosts.length} posts, ${users.length} users, ` +
      `${wpCategories.length} categories, ${wpTags.length} tags`,
  )

  const newsResults = await Promise.all(newsItems.map(importNewsItem(payload, editorConfig)))
  payload.logger.info(`News: ${JSON.stringify(countBy(newsResults))}`)

  const caseStudyResults = await Promise.all(
    caseStudies.map(importCaseStudy(payload, editorConfig)),
  )
  payload.logger.info(`Case studies: ${JSON.stringify(countBy(caseStudyResults))}`)

  const wpUserToAuthor = await buildAuthorMap(payload, users, wpPosts)

  const [categoryMap, tagMap] = await Promise.all([
    buildTaxonomyMap(payload, 'categories', wpCategories),
    buildTaxonomyMap(payload, 'tags', wpTags),
  ])
  payload.logger.info(`Taxonomies ready: ${categoryMap.size} categories, ${tagMap.size} tags`)

  const postResults = await importPostsInBatches(
    payload,
    editorConfig,
    { authors: wpUserToAuthor, categories: categoryMap, tags: tagMap },
    wpPosts,
  )
  payload.logger.info(`Posts: ${JSON.stringify(countBy(postResults))}`)

  const linkResults = await Promise.all(wpPosts.map(linkPostAuthor(payload, wpUserToAuthor)))
  payload.logger.info(`Post → author links: ${JSON.stringify(countBy(linkResults))}`)

  payload.logger.info('WP content import complete')
}

await importWpContent()
process.exit(0)
