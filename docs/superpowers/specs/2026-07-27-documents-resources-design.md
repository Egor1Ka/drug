# Documents & Resources — design

**Date:** 2026-07-27
**Goal:** reproduce `https://drug-card.io/documents/` on the Payload + Next.js site, and migrate the ten real documents (PDFs + covers) into the production database.

## 1. What the original does

`/documents/` on drug-card.io is a hand-built Elementor page (WordPress post `5246`). There is **no** custom post type behind it — every card is a hardcoded builder block, and every "Get PDF" button opens its own Elementor popup.

Page structure, top to bottom:

1. Site header (shared).
2. Breadcrumbs: `HOME / DOCUMENTS & RESOURCES`.
3. `<h1>` "Documents & Resources" (Nunito 600, 46px).
4. Sub-heading "All essential materials in one place: AI documentation, practical materials, and additional resources to support your work." — marked up as `<h2>` on the original, which is an SEO mistake we do not reproduce; ours is a `<p>`.
5. A three-column grid of ten cards. Each card: cover image (a screenshot of the PDF's first page), `<h2>` title (Nunito 500, 24px), description (Nunito 300, 14px/22.4), orange `Get PDF` button (`#FF8C18`, white, radius 3px, padding 12/24).
6. Orange wave CTA "Have questions for our experts?" with `Book 15 minute meeting` + `Contact Us`.
7. Shared footer.

Absent from the original, therefore out of scope: filters, search, categories, pagination, visible dates, per-document detail pages.

Card order on the page is chronological by upload date, ascending — new documents are appended to the end of the grid.

### The download gate

Nine of the ten popups are Elementor forms (`First Name*`, `Second Name*`, `Email*` → `DOWNLOAD`). The tenth and newest uses an embedded HubSpot form (portal `26507628`, region `eu1`) titled "Fill out the form to get the document." with `First Name*`, `Last Name*`, `Email*` → `Submit`. The site is mid-migration to HubSpot.

The PDFs themselves are **not** protected — they sit in the open `wp-content/uploads/` and download without any form. The gate is a lead-capture device, not an access control.

## 2. Decisions

| Question | Decision |
|---|---|
| Gate provider | Payload Form Builder — leads land in `form-submissions` in our own admin, and `FormRenderer` / `useFormSubmission` / the `contact` modal pattern already exist. No new dependency. |
| PDF delivery | Public URL from Media (Vercel Blob), same as the original. The modal reveals a Download button on success. |
| Locales | `en` filled verbatim from the site; `uk` left empty and served by Payload's `fallback: true`. Interface strings are translated in `messages/uk.json`. |
| Production | Import script runs against the production database and uploads the twenty files to Vercel Blob, creating the documents as `published`. Idempotent: upsert by slug. |

## 3. Payload

### Collection `documents`

```
title       text,     localized, required
slug        slugField()
description textarea, localized, required   — card copy
coverImage  upload → media, required        — screenshot of the PDF's first page
file        upload → media, required        — the PDF itself
order       number,   sidebar               — manual ordering, mirrors the original
publishedAt date,     sidebar
```

`defaultSort: 'order'`. The original's sequence is curated rather than date-driven, so an explicit `order` models it honestly and keeps control in the admin. No SEO tab: there are no per-document pages, so there is no metadata to fill.

Drafts are enabled (`versions.drafts` with `schedulePublish`), matching the other content collections.

### Access — the mandatory checklist

1. `MANAGED_COLLECTIONS.documents = { label: 'Documents', publicRead: 'published' }`.
2. `access: collectionAccess('documents')`.
3. `admin.hidden: hiddenFor('documents')`.
4. `pnpm generate:types` — the permission checkboxes on `Users` are generated from the matrix.
5. Grant the permissions in the admin; a new collection starts invisible to every non-full-admin.

Plus registration in `payload.config.ts` and a `revalidateDocuments` hook modelled on `revalidateCaseStudies` (route-pattern revalidation under `/[locale]/documents`).

## 4. The gate form

One `forms` document, `slug: 'document-download'`: `First Name`, `Last Name`, `Email`, `submitButtonLabel: "DOWNLOAD"`, a `confirmationMessage` rich text. Created idempotently by the import script, edited thereafter in the admin.

Two optional props are added to the existing `FormRenderer`; both default to today's behaviour, so `contact` and `NewsletterSignup` are unaffected:

- `extraSubmissionData?: SubmissionEntry[]` — appended to the submission. The documents feature passes `{ field: 'document', value: <title> }`, without which a submission would not say which file was requested.
- `successSlot?: ReactNode` — rendered after `confirmationMessage` on success; the Download button goes there. A slot rather than a callback prop, per the project's component conventions.

## 5. Frontend feature

```
_features/documents/
  api/documents.ts              fetchPublishedDocuments({ locale })
  ui/DocumentCard.tsx           cover + title + description + button slot
  ui/DocumentsArchive.tsx       responsive 1 / 2 / 3 column grid
  ui/DocumentsCta.tsx           the closing "Have questions for our experts?" band
  ui/DocumentsListingLayout.tsx Root / .Breadcrumbs / .Header / .Content / .Cta
  ui/DocumentGateProvider.tsx   'use client' — context holding the open document
  ui/DocumentGateDialog.tsx     'use client' — modal, FormRenderer, Download
  ui/GetPdfButton.tsx           'use client' — trigger
  index.ts                      server-side public API
  client.ts                     client-safe subset
```

This mirrors the `contact` feature's Provider / Dialog / Trigger split, which already works in this codebase.

`Breadcrumbs` currently lives in `_features/blog/ui/`. This page is the second consumer, which is the project's stated trigger for promotion, so it moves to `_shared/ui/Breadcrumbs.tsx` and the blog re-exports from there.

Cards are stretched to equal height with the button pinned to the bottom. The original's buttons sit at slightly different heights within a row; that is a layout defect, not a design decision, and is not reproduced.

## 6. Route and i18n

`src/app/(frontend)/[locale]/documents/page.tsx` — a thin container: `setRequestLocale`, `fetchPublishedDocuments`, render into layout slots, `revalidate = 600`, `generateMetadata` with `buildLocaleAlternates('/documents')`.

`messages/{en,uk}.json` gain a `Documents` namespace for pure UI strings only: page title, subtitle, `Get PDF`, `Download`, the sending label, the network-error text, the close label, and the closing CTA copy. The submit button label and the success message come from the form document, never from `messages` — per the project's Form Builder conventions.

## 7. Import and production migration

`scripts/import-documents.ts`, exposed as `pnpm import:documents`:

- carries a table of the ten documents (title, description, slug, cover URL, PDF URL, order);
- downloads each asset and creates a `media` document from the buffer, as `import-wp-content.ts` does;
- upserts by slug, so re-running updates rather than duplicates;
- creates the `document-download` form when it is missing;
- honours `DRY_RUN=1` to log the plan without writing.

Rollout: run locally, verify the page in a browser, then run against production through `scripts/import-documents-prod.local.sh` (gitignored, carries the production `DATABASE_URL`, `PAYLOAD_SECRET` and `BLOB_READ_WRITE_TOKEN`; `--dry-run` first), which mirrors the existing `seed-prod.local.sh` pattern.

Note on idempotency: media is looked up by filename, but Payload appends a `-1`
suffix when a name is already taken, so the filename lookup alone would re-upload
on a second run. The guarantee therefore rests on the document, not the file: an
existing document keeps its `coverImage`/`file` relationships and no upload is
attempted. `FORCE_ASSETS=1` overrides that deliberately.

### Content

| # | Title | Cover | PDF |
|---|---|---|---|
| 1 | Is Your Literature Review Missing AI Advantage | `2025/11/2.png` | `Is-Your-Literature-Review-Missing-AI-Advantage.pdf` |
| 2 | Adverse Event Database from DrugCard | `2025/11/adr.jpg` | `How-Adverse-Event-Database-from-DrugCard-Works.pdf` |
| 3 | Regulatory Intelligence Software from DrugCard | `2025/11/RI.jpg` | `How-Regulatory-Intelligence-Software-from-DrugCard-Works.pdf` |
| 4 | How Automated Literature Monitoring from DrugCard Works | `2025/12/Journals-1.png` | `How-Automated-Literature-Monitoring-from-DrugCard-Works.pdf` |
| 5 | How to Choose the Best Software for Literature Monitoring – A Practical Checklist | `2025/12/checklist.png` | `How-to-Choose-the-Best-Software-for-Literature-Monitoring-A-Practical-Checklist.pdf` |
| 6 | Pharmacovigilance Literature Monitoring Pre-Audit Checklist | `2026/01/Journals-pre-audit.png` | `Pharmacovigilance-Literature-Monitoring-Pre-Audit-Checklist.pdf` |
| 7 | Pharmacovigilance services by DrugCard | `2026/01/Journals-2.png` | `Pharmacovigilance-services-by-DrugCard.pdf` |
| 8 | How to Explain DrugCard to Management for PV | `2026/02/how-to-explain1.png` | `How-to-explain-DrugCard-to-manager-Guide-for-PV-specialists.pdf` |
| 9 | How QPPVs Can Explain DrugCard to Management | `2026/02/how-to-explain2.png` | `How-to-explain-DrugCard-to-manager-Guide-for-QPPVs.pdf` |
| 10 | Using AI in Pharmacovigilance | `2026/02/Journals-Using-AI.png` | `Using-AI-in-Pharmacovigilance.pdf` |

All paths are relative to `https://drug-card.io/wp-content/uploads/`.

## 8. Verification

`pnpm lint`, `pnpm build`, and a browser check of `/en/documents` against a screenshot of the original — grid, card anatomy, gate modal, and a real download.
