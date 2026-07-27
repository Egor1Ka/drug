import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

// Brings the site's SEO up to the original drug-card.io:
//   1. uploads the share banner used across drug-card.io into Media
//   2. upserts a `page-content` document per hand-coded page carrying that
//      page's title, description and share image, so editors own them
//   3. backfills the handful of imported documents whose Yoast data did not
//      come across (missing description or share image)
//
// Idempotent: pages are matched by `pageKey`, media by filename, and existing
// values are only overwritten when this script is the source of truth for them
// (page-level SEO). DRY_RUN=1 logs the plan without writing.

const UPLOADS = 'https://drug-card.io/wp-content/uploads'
const WP_API = 'https://drug-card.io/wp-json/wp/v2'

const DRY_RUN = process.env.DRY_RUN === '1'

// The original serves one share image on every static page; only articles have
// their own artwork. 1200x627, which is the aspect every scraper wants.
const BANNER_URL = `${UPLOADS}/2023/03/banner.png`
const BANNER_FILENAME = 'og-default-banner.png'

// Titles and descriptions read straight off the live pages. The brand suffix
// is theirs — long for Google's ~60 character cut-off, but it is what the
// original ships and what was asked for.
const BRAND_SUFFIX = 'DrugCard: Comprehensive Literature Screening & Pharmacovigilance Solutions'
const GENERIC_DESCRIPTION =
  'DrugCard - AI-powered pharmacovigilance platform automating drug safety monitoring and improving patient safety worldwide.'

type PageSeo = {
  description: string
  pageKey: string
  title: string
}

const PAGE_SEO: PageSeo[] = [
  {
    description:
      'DrugCard - AI-powered pharmacovigilance tools & services for automated literature monitoring, regulatory intelligence and adverse events management.',
    pageKey: 'home',
    title: BRAND_SUFFIX,
  },
  {
    description: 'Stay informed with Drug Card updates. Explore now.',
    pageKey: 'blog',
    title: `Blog - ${BRAND_SUFFIX}`,
  },
  {
    description: GENERIC_DESCRIPTION,
    pageKey: 'news',
    title: `News - ${BRAND_SUFFIX}`,
  },
  {
    description: GENERIC_DESCRIPTION,
    pageKey: 'case-studies',
    title: `Case Studies - ${BRAND_SUFFIX}`,
  },
  {
    description: GENERIC_DESCRIPTION,
    pageKey: 'documents',
    title: `Documents & Resources - ${BRAND_SUFFIX}`,
  },
  {
    description: GENERIC_DESCRIPTION,
    pageKey: 'journals',
    title: `Local Medical Journals - ${BRAND_SUFFIX}`,
  },
]

// --- media ------------------------------------------------------------------

const findMediaIdByFilename = async (payload: Payload, filename: string) => {
  const result = await payload.find({
    collection: 'media',
    limit: 1,
    where: { filename: { equals: filename } },
  })

  const existing = result.docs[0]

  return existing ? String(existing.id) : null
}

const fetchBuffer = async (url: string) => {
  const response = await fetch(url)

  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  return Buffer.from(await response.arrayBuffer())
}

const mimetypeFromUrl = (url: string) =>
  url.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

const uploadImage = async (payload: Payload, alt: string, filename: string, url: string) => {
  const existingId = await findMediaIdByFilename(payload, filename)
  if (existingId) {
    payload.logger.info(`Reusing existing media ${filename}`)
    return existingId
  }

  if (DRY_RUN) {
    payload.logger.info(`[dry-run] would upload ${filename} from ${url}`)
    return null
  }

  const data = await fetchBuffer(url)

  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype: mimetypeFromUrl(url), name: filename, size: data.length },
  })

  payload.logger.info(`Uploaded ${filename} (${Math.round(data.length / 1024)} KB)`)

  return String(created.id)
}

// --- page-level SEO ---------------------------------------------------------

const findPageContent = async (payload: Payload, pageKey: string) => {
  const result = await payload.find({
    collection: 'page-content',
    limit: 1,
    locale: 'en',
    where: { pageKey: { equals: pageKey } },
  })

  return result.docs[0] || null
}

const upsertPageSeo =
  (payload: Payload, bannerId: string | null) =>
  async (page: PageSeo): Promise<'created' | 'updated' | null> => {
    const existing = await findPageContent(payload, page.pageKey)

    if (DRY_RUN) {
      payload.logger.info(
        `[dry-run] would ${existing ? 'update' : 'create'} page-content "${page.pageKey}" -> ${page.title}`,
      )
      return null
    }

    const meta = {
      description: page.description,
      image: bannerId,
      title: page.title,
    }

    if (existing) {
      await payload.update({
        collection: 'page-content',
        context: { disableRevalidate: true },
        data: { meta },
        id: existing.id,
        locale: 'en',
      })

      payload.logger.info(`Updated SEO for page "${page.pageKey}"`)

      return 'updated'
    }

    await payload.create({
      collection: 'page-content',
      context: { disableRevalidate: true },
      data: { meta, pageKey: page.pageKey },
      locale: 'en',
    })

    payload.logger.info(`Created page-content "${page.pageKey}" with SEO`)

    return 'created'
  }

// --- backfilling imported documents ----------------------------------------

type YoastImage = { url?: string }
type YoastHead = { description?: string; og_description?: string; og_image?: YoastImage[] }
type WpEntry = { slug: string; yoast_head_json?: YoastHead }

// Several entries have no hand-written Yoast description but do carry the
// auto-generated og_description, which is the excerpt and perfectly usable.
const descriptionOf = (yoast: YoastHead) => yoast.description || yoast.og_description

// Some slugs picked up the brand suffix during the WP import
// ("…-pharmacovigilance-drugcard"), so the original is tried without it too.
const slugCandidates = (slug: string) => {
  const withoutBrand = slug.replace(/-drugcard$/, '')

  return withoutBrand === slug ? [slug] : [slug, withoutBrand]
}

const fetchWpEntry = async (restBase: string, slug: string): Promise<WpEntry | null> => {
  const attempt = async (candidate: string) => {
    const response = await fetch(
      `${WP_API}/${restBase}?slug=${encodeURIComponent(candidate)}&_fields=slug,yoast_head_json`,
    )

    if (!response.ok) return null

    const entries = (await response.json()) as WpEntry[]

    return entries[0] || null
  }

  const results = await Promise.all(slugCandidates(slug).map(attempt))

  return results.find(Boolean) || null
}

type BackfillTarget = {
  collection: 'posts' | 'news' | 'case-studies'
  restBase: string
}

const BACKFILL_TARGETS: BackfillTarget[] = [
  { collection: 'posts', restBase: 'posts' },
  { collection: 'news', restBase: 'news-updates' },
  { collection: 'case-studies', restBase: 'case-study' },
]

type MetaImage = string | { id?: string | number } | null
type MetaShape = { description?: string | null; image?: MetaImage; title?: string | null }
type BackfillDoc = { id: string | number; meta?: MetaShape | null; slug?: string | null }

const metaImageId = (image: MetaImage | undefined) => {
  if (!image) return undefined

  return typeof image === 'object' ? String(image.id) : String(image)
}

const isIncomplete = (doc: BackfillDoc) =>
  Boolean(doc.slug) && (!doc.meta || !doc.meta.description || !doc.meta.image)

const backfillDoc =
  (payload: Payload, target: BackfillTarget) =>
  async (doc: BackfillDoc): Promise<'filled' | 'unmatched' | null> => {
    const slug = String(doc.slug)
    const entry = await fetchWpEntry(target.restBase, slug)

    if (!entry || !entry.yoast_head_json) {
      payload.logger.warn(`No Yoast data on the original for ${target.collection}/${slug}`)
      return 'unmatched'
    }

    const yoast = entry.yoast_head_json
    const originalDescription = descriptionOf(yoast)
    const needsDescription = !doc.meta?.description && Boolean(originalDescription)
    const originalImage = yoast.og_image && yoast.og_image[0] ? yoast.og_image[0].url : undefined
    const needsImage = !doc.meta?.image && Boolean(originalImage)

    if (!needsDescription && !needsImage) return null

    if (DRY_RUN) {
      payload.logger.info(
        `[dry-run] would backfill ${target.collection}/${slug}: ${[
          needsDescription ? 'description' : null,
          needsImage ? 'image' : null,
        ]
          .filter(Boolean)
          .join(' + ')}`,
      )
      return null
    }

    const imageId = needsImage
      ? await uploadImage(payload, slug, `og-${slug}.jpg`, String(originalImage))
      : null

    try {
      await payload.update({
        collection: target.collection,
        context: { disableRevalidate: true },
        // The meta group is rebuilt explicitly rather than spread, so an
        // untouched field is carried over as its own value instead of a
        // populated object Payload would reject.
        data: {
          meta: {
            description: needsDescription
              ? originalDescription
              : doc.meta?.description || undefined,
            image: imageId || metaImageId(doc.meta?.image),
            title: doc.meta?.title || undefined,
          },
        },
        id: doc.id,
        locale: 'en',
      })
    } catch (error) {
      // A handful of WP-imported articles carry Lexical content the current
      // editor config rejects, so every write to them fails validation. That
      // is a content defect, not an SEO one — it must not abort the run and
      // leave later collections untouched.
      payload.logger.warn(
        `Could not update ${target.collection}/${slug}: ${String(error).split('\n')[0]}`,
      )
      return 'unmatched'
    }

    payload.logger.info(`Backfilled ${target.collection}/${slug}`)

    return 'filled'
  }

const backfillCollection = async (payload: Payload, target: BackfillTarget) => {
  const result = await payload.find({
    collection: target.collection,
    depth: 0,
    limit: 1000,
    locale: 'en',
    pagination: false,
  })

  const incomplete = (result.docs as BackfillDoc[]).filter(isIncomplete)

  if (incomplete.length === 0) {
    payload.logger.info(`${target.collection}: nothing to backfill`)
    return
  }

  payload.logger.info(`${target.collection}: ${incomplete.length} document(s) with gaps`)

  await incomplete.reduce(
    async (previous, doc) => {
      await previous
      await backfillDoc(payload, target)(doc)
    },
    Promise.resolve() as Promise<void>,
  )
}

// --- run --------------------------------------------------------------------

const importSeo = async () => {
  const payload = await getPayload({ config })

  payload.logger.info(DRY_RUN ? '--- SEO import (DRY RUN) ---' : '--- SEO import ---')

  const bannerId = await uploadImage(payload, 'DrugCard', BANNER_FILENAME, BANNER_URL)

  await PAGE_SEO.reduce(
    async (previous, page) => {
      await previous
      await upsertPageSeo(payload, bannerId)(page)
    },
    Promise.resolve() as Promise<void>,
  )

  await BACKFILL_TARGETS.reduce(
    async (previous, target) => {
      await previous
      await backfillCollection(payload, target)
    },
    Promise.resolve() as Promise<void>,
  )

  payload.logger.info('SEO import complete')
}

await importSeo()
process.exit(0)
