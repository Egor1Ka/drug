import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Form } from '@/payload-types'

// Imports the ten gated documents from the original drug-card.io
// "Documents & Resources" page into the `documents` collection, uploading each
// cover image and PDF into Media (Vercel Blob in production).
//
// Idempotent: documents are matched by slug and updated in place, assets are
// matched by filename and reused, so re-running fills gaps instead of
// duplicating. Run with DRY_RUN=1 to log the plan without writing, and
// FORCE_ASSETS=1 to re-upload covers/PDFs onto documents that already have them.
//
// Locales: only `en` is imported, matching the original, which is English-only.
// The `uk` locale falls back to `en` (payload.config localization.fallback).

const UPLOADS = 'https://drug-card.io/wp-content/uploads'

const DRY_RUN = process.env.DRY_RUN === '1'
const FORCE_ASSETS = process.env.FORCE_ASSETS === '1'

const DOWNLOAD_FORM_SLUG = 'document-download'

type DocumentSource = {
  coverUrl: string
  description: string
  fileUrl: string
  order: number
  publishedAt: string
  slug: string
  title: string
}

// Order, titles and descriptions are taken verbatim from the live page; the
// sequence is the original's own, which is curated rather than date-sorted.
const DOCUMENT_SOURCES: DocumentSource[] = [
  {
    coverUrl: `${UPLOADS}/2025/11/2.png`,
    description:
      'This one-pager helps pharmacovigilance professionals identify inefficiencies in their manual literature monitoring and shows how AI can streamline reviews, reduce workload, and improve accuracy.',
    fileUrl: `${UPLOADS}/2025/11/Is-Your-Literature-Review-Missing-AI-Advantage.pdf`,
    order: 1,
    publishedAt: '2025-11-19T00:00:00.000Z',
    slug: 'is-your-literature-review-missing-ai-advantage',
    title: 'Is Your Literature Review Missing AI Advantage',
  },
  {
    coverUrl: `${UPLOADS}/2025/11/adr.jpg`,
    description:
      'The document presents Adverse Event Database – a simplified, cost-effective ICSR management system with AI-assisted case creation, fast structured data entry, centralized case oversight, and flexible exports for audits and reporting.',
    fileUrl: `${UPLOADS}/2025/11/How-Adverse-Event-Database-from-DrugCard-Works.pdf`,
    order: 2,
    publishedAt: '2025-11-25T00:00:00.000Z',
    slug: 'adverse-event-database-from-drugcard',
    title: 'Adverse Event Database from DrugCard',
  },
  {
    coverUrl: `${UPLOADS}/2025/11/RI.jpg`,
    description:
      'This file presents the Regulatory Intelligence tool, which centralizes global regulatory updates into a real-time, AI-summarized newsfeed with automated PDFs and fully customizable source monitoring.',
    fileUrl: `${UPLOADS}/2025/11/How-Regulatory-Intelligence-Software-from-DrugCard-Works.pdf`,
    order: 3,
    publishedAt: '2025-11-26T00:00:00.000Z',
    slug: 'regulatory-intelligence-software-from-drugcard',
    title: 'Regulatory Intelligence Software from DrugCard',
  },
  {
    coverUrl: `${UPLOADS}/2025/12/Journals-1.png`,
    description:
      'This document explains how DrugCard’s automated literature monitoring platform streamlines global journal tracking with AI-driven categorization, summaries, QC, and reporting — ensuring complete, audit-ready PV compliance.',
    fileUrl: `${UPLOADS}/2025/12/How-Automated-Literature-Monitoring-from-DrugCard-Works.pdf`,
    order: 4,
    publishedAt: '2025-12-04T00:00:00.000Z',
    slug: 'how-automated-literature-monitoring-from-drugcard-works',
    title: 'How Automated Literature Monitoring from DrugCard Works',
  },
  {
    coverUrl: `${UPLOADS}/2025/12/checklist.png`,
    description:
      'This practical checklist for pharmacovigilance teams to evaluate and compare literature monitoring software, covering compliance, AI features, usability, security, and scalability.',
    fileUrl: `${UPLOADS}/2025/12/How-to-Choose-the-Best-Software-for-Literature-Monitoring-A-Practical-Checklist.pdf`,
    order: 5,
    publishedAt: '2025-12-19T00:00:00.000Z',
    slug: 'how-to-choose-the-best-software-for-literature-monitoring',
    title: 'How to Choose the Best Software for Literature Monitoring – A Practical Checklist',
  },
  {
    coverUrl: `${UPLOADS}/2026/01/Journals-pre-audit.png`,
    description:
      'Adequate preparation for a pharmacovigilance audit requires careful planning and a structured approach. Using a Pharmacovigilance Literature Monitoring Checklist allows PV teams to assess their processes, identify gaps, and ensure they are fully prepared for an audit.',
    fileUrl: `${UPLOADS}/2026/01/Pharmacovigilance-Literature-Monitoring-Pre-Audit-Checklist.pdf`,
    order: 6,
    publishedAt: '2026-01-14T00:00:00.000Z',
    slug: 'pharmacovigilance-literature-monitoring-pre-audit-checklist',
    title: 'Pharmacovigilance Literature Monitoring Pre-Audit Checklist',
  },
  {
    coverUrl: `${UPLOADS}/2026/01/Journals-2.png`,
    description:
      'This document outlines DrugCard’s end-to-end pharmacovigilance services, delivered with minimal client effort and full regulatory compliance.',
    fileUrl: `${UPLOADS}/2026/01/Pharmacovigilance-services-by-DrugCard.pdf`,
    order: 7,
    publishedAt: '2026-01-16T00:00:00.000Z',
    slug: 'pharmacovigilance-services-by-drugcard',
    title: 'Pharmacovigilance services by DrugCard',
  },
  {
    coverUrl: `${UPLOADS}/2026/02/how-to-explain1.png`,
    description:
      'This file is a practical Q&A guide that helps pharmacovigilance specialists clearly explain DrugCard’s value to management.',
    fileUrl: `${UPLOADS}/2026/02/How-to-explain-DrugCard-to-manager-Guide-for-PV-specialists.pdf`,
    order: 8,
    publishedAt: '2026-02-04T00:00:00.000Z',
    slug: 'how-to-explain-drugcard-to-management-for-pv',
    title: 'How to Explain DrugCard to Management for PV',
  },
  {
    coverUrl: `${UPLOADS}/2026/02/how-to-explain2.png`,
    description:
      'This document is a strategic Q&A guide designed to help QPPVs explain DrugCard to management, focusing on risk reduction, regulatory readiness, scalability.',
    fileUrl: `${UPLOADS}/2026/02/How-to-explain-DrugCard-to-manager-Guide-for-QPPVs.pdf`,
    order: 9,
    publishedAt: '2026-02-04T00:00:00.000Z',
    slug: 'how-qppvs-can-explain-drugcard-to-management',
    title: 'How QPPVs Can Explain DrugCard to Management',
  },
  {
    coverUrl: `${UPLOADS}/2026/02/Journals-Using-AI.png`,
    description:
      'This guide explains how AI is transforming PV — from automating ICSR processing and literature monitoring to enabling scalable, compliant, human-supervised safety intelligence.',
    fileUrl: `${UPLOADS}/2026/02/Using-AI-in-Pharmacovigilance.pdf`,
    order: 10,
    publishedAt: '2026-02-11T00:00:00.000Z',
    slug: 'using-ai-in-pharmacovigilance',
    title: 'Using AI in Pharmacovigilance',
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

// Assets are stored under a document-scoped filename rather than the WP one:
// covers like "2.png" and "checklist.png" are generic enough to collide with
// media the WP import already uploaded, both in Mongo and in the Blob store.
const assetFilename = (slug: string, role: 'cover' | 'file', url: string) =>
  `document-${slug}-${role}.${extensionOf(url)}`

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
    confirmation: 'Thank you! Your document is ready — download it below.',
    submit: 'DOWNLOAD',
    title: 'Document download',
  },
  uk: {
    confirmation: 'Дякуємо! Ваш документ готовий — завантажте його нижче.',
    submit: 'ЗАВАНТАЖИТИ',
    title: 'Document download',
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

// --- documents --------------------------------------------------------------

const findExistingDocument = async (payload: Payload, slug: string) => {
  const result = await payload.find({
    collection: 'documents',
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

const importDocument =
  (payload: Payload) =>
  async (source: DocumentSource): Promise<ImportOutcome | null> => {
    const existing = await findExistingDocument(payload, source.slug)

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
        `[dry-run] would ${existing ? 'update' : 'create'} document "${source.slug}"`,
      )
      return null
    }

    if (!coverId || !fileId) {
      throw new Error(`Missing assets for "${source.slug}" — cover or PDF failed to upload`)
    }

    const data = {
      _status: 'published' as const,
      coverImage: coverId,
      description: source.description,
      file: fileId,
      order: source.order,
      publishedAt: source.publishedAt,
      slug: source.slug,
      title: source.title,
    }

    if (existing) {
      await payload.update({
        collection: 'documents',
        context: { disableRevalidate: true },
        data,
        id: existing.id,
        locale: 'en',
      })

      payload.logger.info(`Updated document "${source.slug}"`)

      return 'updated'
    }

    await payload.create({
      collection: 'documents',
      context: { disableRevalidate: true },
      data,
      locale: 'en',
    })

    payload.logger.info(`Created document "${source.slug}"`)

    return 'created'
  }

// Sequential on purpose: ten parallel Blob uploads against one Mongo Atlas
// transaction budget is how the WP import learned to retry.
const runSequentially =
  (importOne: (source: DocumentSource) => Promise<ImportOutcome | null>) =>
  async (previous: Promise<(ImportOutcome | null)[]>, source: DocumentSource) => {
    const results = await previous

    return [...results, await importOne(source)]
  }

const matching = (outcome: ImportOutcome) => (item: ImportOutcome | null) => item === outcome

const countOf = (outcomes: (ImportOutcome | null)[], outcome: ImportOutcome) =>
  outcomes.filter(matching(outcome)).length

const importDocuments = async () => {
  const payload = await getPayload({ config })

  payload.logger.info(
    DRY_RUN ? '--- documents import (DRY RUN) ---' : '--- documents import ---',
  )

  await ensureDownloadForm(payload)

  const outcomes = await DOCUMENT_SOURCES.reduce(
    runSequentially(importDocument(payload)),
    Promise.resolve([] as (ImportOutcome | null)[]),
  )

  payload.logger.info(
    `Done: ${countOf(outcomes, 'created')} created, ${countOf(outcomes, 'updated')} updated, ${DOCUMENT_SOURCES.length} total`,
  )
}

await importDocuments()
process.exit(0)
