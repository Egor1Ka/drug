import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Form } from '@/payload-types'

// Imports the country journal lists from the original drug-card.io
// "Local Medical Journals" page into the `journals` collection, uploading each
// cover image and PDF into Media (Vercel Blob in production).
//
// Sibling of scripts/import-documents.ts and idempotent in the same way:
// journals are matched by slug and updated in place, assets are matched by
// filename and reused. DRY_RUN=1 logs the plan without writing; FORCE_ASSETS=1
// re-uploads covers/PDFs onto journals that already have them.
//
// Locales: only `en` is imported, matching the original, which is English-only.
// The `uk` locale falls back to `en` (payload.config localization.fallback).

const UPLOADS = 'https://drug-card.io/wp-content/uploads'

const DRY_RUN = process.env.DRY_RUN === '1'
const FORCE_ASSETS = process.env.FORCE_ASSETS === '1'

const DOWNLOAD_FORM_SLUG = 'journal-download'

type JournalSource = {
  country: string
  coverUrl: string
  fileUrl: string
  order: number
  slug: string
  title: string
}

// Titles and order are taken verbatim from the live page.
//
// Greece note: the media library holds two candidate files — Greece1.pdf
// (2 Dec) and Local-Journals-Greece.pdf (3 Dec), both 13 pages and differing
// byte-wise, i.e. two revisions of one document. Which one the live form
// serves is decided server-side and is not observable from outside, so the
// later revision is imported. Swapping is a one-line change here.
const JOURNAL_SOURCES: JournalSource[] = [
  {
    country: 'Greece',
    coverUrl: `${UPLOADS}/2025/12/Journals.png`,
    fileUrl: `${UPLOADS}/2025/12/Local-Journals-Greece.pdf`,
    order: 1,
    slug: 'greece-local-medical-journals',
    title: 'Greece - Local Medical Journals',
  },
  {
    country: 'Spain',
    coverUrl: `${UPLOADS}/2025/12/Journals-Spain.png`,
    fileUrl: `${UPLOADS}/2025/12/Spain-Local-Journals.pdf`,
    order: 2,
    slug: 'spain-local-medical-journals',
    title: 'Spain - Local Medical Journals',
  },
  {
    // The source file really is named "...pdf.pdf" on the original site.
    country: 'Croatia',
    coverUrl: `${UPLOADS}/2026/05/Journals-Croatia.png`,
    fileUrl: `${UPLOADS}/2026/05/Croatia-Local-Journals.pdf.pdf`,
    order: 3,
    slug: 'croatia-local-medical-journals',
    title: 'Croatia - Local Medical Journals',
  },
]

// --- assets -----------------------------------------------------------------

const MIMETYPE_BY_EXTENSION: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
  webp: 'image/webp',
}

const extensionOf = (url: string) => url.split('.').slice(-1)[0].toLowerCase()

const mimetypeFromUrl = (url: string) => MIMETYPE_BY_EXTENSION[extensionOf(url)] || 'image/jpeg'

const fetchAssetBuffer = async (url: string) => {
  const response = await fetch(url)

  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  return Buffer.from(await response.arrayBuffer())
}

// Journal-scoped filenames: the WP names ("Journals.png") are generic enough
// to collide with media the other imports already uploaded.
const assetFilename = (slug: string, role: 'cover' | 'file', url: string) =>
  `journal-${slug}-${role}.${extensionOf(url)}`

const findExistingMediaId = async (payload: Payload, filename: string) => {
  const result = await payload.find({
    collection: 'media',
    limit: 1,
    where: { filename: { equals: filename } },
  })

  const existing = result.docs[0]

  return existing ? String(existing.id) : null
}

type UploadArgs = {
  alt: string
  filename: string
  url: string
}

const createAssetUploader =
  (payload: Payload) =>
  async ({ alt, filename, url }: UploadArgs): Promise<string | null> => {
    const existingId = await findExistingMediaId(payload, filename)
    if (existingId) {
      payload.logger.info(`Reusing existing media ${filename}`)
      return existingId
    }

    if (DRY_RUN) {
      payload.logger.info(`[dry-run] would upload ${filename} from ${url}`)
      return null
    }

    const data = await fetchAssetBuffer(url)

    const created = await payload.create({
      collection: 'media',
      data: { alt },
      file: { data, mimetype: mimetypeFromUrl(url), name: filename, size: data.length },
    })

    payload.logger.info(`Uploaded ${filename} (${Math.round(data.length / 1024)} KB)`)

    return String(created.id)
  }

// --- the download form ------------------------------------------------------

const toRichTextParagraph = (text: string) => ({
  root: {
    children: [
      {
        children: [{ text, type: 'text', version: 1 }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const DOWNLOAD_FORM_FIELDS = [
  { blockType: 'text', labels: { en: 'First Name', uk: "Ім'я" }, name: 'firstName' },
  { blockType: 'text', labels: { en: 'Last Name', uk: 'Прізвище' }, name: 'lastName' },
  { blockType: 'email', labels: { en: 'Email', uk: 'Email' }, name: 'email' },
] as const

const DOWNLOAD_FORM_COPY = {
  en: {
    confirmation: 'Thank you! Your journal list is ready — download it below.',
    submit: 'DOWNLOAD',
    title: 'Journal list download',
  },
  uk: {
    confirmation: 'Дякуємо! Ваш перелік журналів готовий — завантажте його нижче.',
    submit: 'ЗАВАНТАЖИТИ',
    title: 'Journal list download',
  },
}

type FormRow = NonNullable<Form['fields']>[number]

const toFormFieldEn = (field: (typeof DOWNLOAD_FORM_FIELDS)[number]) => ({
  blockType: field.blockType,
  label: field.labels.en,
  name: field.name,
  required: true,
})

const buildFormFieldsEn = () =>
  DOWNLOAD_FORM_FIELDS.map(toFormFieldEn) as NonNullable<Form['fields']>

const toUkLabelEntry = (field: (typeof DOWNLOAD_FORM_FIELDS)[number]) =>
  [field.name, field.labels.uk] as const

const UK_LABEL_BY_NAME: Record<string, string> = Object.fromEntries(
  DOWNLOAD_FORM_FIELDS.map(toUkLabelEntry),
)

// The field structure (names, order, required) is shared across locales — the
// uk pass rewrites the SAME rows (ids preserved) with translated labels only.
const toUkRow = (row: FormRow) => ({
  ...row,
  label: UK_LABEL_BY_NAME[row.name] || row.label,
})

const ensureDownloadForm = async (payload: Payload) => {
  const existing = await payload.find({
    collection: 'forms',
    limit: 1,
    where: { slug: { equals: DOWNLOAD_FORM_SLUG } },
  })

  if (existing.docs[0]) {
    payload.logger.info(`Form "${DOWNLOAD_FORM_SLUG}" already exists — left untouched`)
    return
  }

  if (DRY_RUN) {
    payload.logger.info(`[dry-run] would create form "${DOWNLOAD_FORM_SLUG}"`)
    return
  }

  const created = await payload.create({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(DOWNLOAD_FORM_COPY.en.confirmation),
      confirmationType: 'message',
      fields: buildFormFieldsEn(),
      slug: DOWNLOAD_FORM_SLUG,
      submitButtonLabel: DOWNLOAD_FORM_COPY.en.submit,
      title: DOWNLOAD_FORM_COPY.en.title,
    },
    locale: 'en',
  })

  const createdRows = (created.fields || []) as FormRow[]

  await payload.update({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(DOWNLOAD_FORM_COPY.uk.confirmation),
      fields: createdRows.map(toUkRow),
      submitButtonLabel: DOWNLOAD_FORM_COPY.uk.submit,
    },
    id: created.id,
    locale: 'uk',
  })

  payload.logger.info(`Created form "${DOWNLOAD_FORM_SLUG}" (shared structure, en + uk labels)`)
}

// --- journals ---------------------------------------------------------------

const findExistingJournal = async (payload: Payload, slug: string) => {
  const result = await payload.find({
    collection: 'journals',
    draft: true,
    limit: 1,
    locale: 'en',
    where: { slug: { equals: slug } },
  })

  return result.docs[0] || null
}

const relationshipId = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'object') return String((value as { id: string | number }).id)

  return String(value)
}

type ImportOutcome = 'created' | 'updated'

const importJournal =
  (payload: Payload) =>
  async (source: JournalSource): Promise<ImportOutcome | null> => {
    const existing = await findExistingJournal(payload, source.slug)

    const existingCoverId = relationshipId(existing?.coverImage)
    const existingFileId = relationshipId(existing?.file)

    const uploadAsset = createAssetUploader(payload)

    const needsCover = FORCE_ASSETS || !existingCoverId
    const needsFile = FORCE_ASSETS || !existingFileId

    const coverId = needsCover
      ? await uploadAsset({
          alt: source.title,
          filename: assetFilename(source.slug, 'cover', source.coverUrl),
          url: source.coverUrl,
        })
      : existingCoverId

    const fileId = needsFile
      ? await uploadAsset({
          alt: source.title,
          filename: assetFilename(source.slug, 'file', source.fileUrl),
          url: source.fileUrl,
        })
      : existingFileId

    if (DRY_RUN) {
      payload.logger.info(
        `[dry-run] would ${existing ? 'update' : 'create'} journal "${source.slug}"`,
      )
      return null
    }

    if (!coverId || !fileId) {
      throw new Error(`Missing assets for "${source.slug}" — cover or PDF failed to upload`)
    }

    const data = {
      _status: 'published' as const,
      country: source.country,
      coverImage: coverId,
      file: fileId,
      order: source.order,
      slug: source.slug,
      title: source.title,
    }

    if (existing) {
      await payload.update({
        collection: 'journals',
        context: { disableRevalidate: true },
        data,
        id: existing.id,
        locale: 'en',
      })

      payload.logger.info(`Updated journal "${source.slug}"`)

      return 'updated'
    }

    await payload.create({
      collection: 'journals',
      context: { disableRevalidate: true },
      data,
      locale: 'en',
    })

    payload.logger.info(`Created journal "${source.slug}"`)

    return 'created'
  }

// Sequential on purpose: parallel Blob uploads against one Mongo Atlas
// transaction budget is how the WP import learned to retry.
const runSequentially =
  (importOne: (source: JournalSource) => Promise<ImportOutcome | null>) =>
  async (previous: Promise<(ImportOutcome | null)[]>, source: JournalSource) => {
    const results = await previous

    return [...results, await importOne(source)]
  }

const matching = (outcome: ImportOutcome) => (item: ImportOutcome | null) => item === outcome

const countOf = (outcomes: (ImportOutcome | null)[], outcome: ImportOutcome) =>
  outcomes.filter(matching(outcome)).length

const importJournals = async () => {
  const payload = await getPayload({ config })

  payload.logger.info(DRY_RUN ? '--- journals import (DRY RUN) ---' : '--- journals import ---')

  await ensureDownloadForm(payload)

  const outcomes = await JOURNAL_SOURCES.reduce(
    runSequentially(importJournal(payload)),
    Promise.resolve([] as (ImportOutcome | null)[]),
  )

  payload.logger.info(
    `Done: ${countOf(outcomes, 'created')} created, ${countOf(outcomes, 'updated')} updated, ${JOURNAL_SOURCES.length} total`,
  )
}

await importJournals()
process.exit(0)
