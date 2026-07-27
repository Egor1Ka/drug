# Local Medical Journals — design

**Date:** 2026-07-27
**Goal:** reproduce `https://drug-card.io/local-medical-journals/` and migrate its three country journal lists into production.

Companion to [Documents & Resources](./2026-07-27-documents-resources-design.md). That page and this one are the same page with different content, so this spec only records what differs and what gets shared.

## 1. What the original does

Another hand-built Elementor page. Structure:

1. Breadcrumbs `HOME / LOCAL MEDICAL JOURNALS`.
2. `<h1>` "List of Local Medical Journals".
3. Sub-heading "Explore the country-specific local medical journals already available on DrugCard. We continuously expand our database and can add any journal you need — fast and without bureaucracy." — again marked up as `<h2>`, again not reproduced as one.
4. A three-column grid of three cards: Greece, Spain, Croatia.
5. The orange "Have questions for our experts?" band. The copy differs by two words from the documents page: "medical literature screening" instead of "literature monitoring".

No filters, no search, no country table, no per-country pages.

### Card anatomy, against the documents page

Identical cover image, title (`h2`, Nunito 500/24px) and button styling (`#FF8C18`, radius 3px, padding 12/24). Two differences: there is **no description**, and the button reads `Download` and is **centred** in its column rather than left-aligned.

Cards are ragged again — Greece and Croatia wrap to two title lines, so their buttons sit lower than Spain's. Not reproduced; ours stretch to equal height.

### The gate

The same Elementor form as the documents page: `First Name`, `Second Name`, `Email` → `DOWNLOAD`. No HubSpot here at all. The original keeps one form per country (`Local_Journal_Greece`, `Local_Journal_Spain`, `Local_Journal_Croatia`) purely because Elementor has no other way to distinguish submissions. The PDFs are unprotected in `wp-content/uploads/`, as before.

## 2. Decisions

| Question | Decision |
|---|---|
| Collection | A separate `journals` collection, not a type field on `documents`. The vendor states the list expands country by country, so it needs its own `country` field and its own ordering, and the admin should not merge two different kinds of thing into one list. |
| Gate form | A separate `journal-download` form, not the documents one. Journal leads stay separable from whitepaper leads without filtering by a text field. |
| Locales | `en` verbatim, `uk` by fallback — as with documents. |
| Production | Same rollout: local run, browser check, then the gitignored prod script, dry run first. |

## 3. Shared machinery

The gate is now needed by two features, and cross-feature imports are forbidden, so the provider and dialog move to `_shared/ui/DownloadGate.tsx` and become generic:

```
type DownloadItem = { fileUrl: string | null; title: string }
type DownloadGateLabels = { close, download, error, formUnavailable, gateTitle, sending }

DownloadGateProvider({ children, form, labels })
useDownloadGate() → { closeGate, openGateFor }
```

Labels arrive as props rather than through `useTranslations`, because `_shared` holds primitives with no business meaning and must not know a translation namespace. Each feature keeps its own trigger button (`GetPdfButton`, `DownloadJournalButton`) — they differ in label and alignment, and they are three lines each.

The submission still carries which item was requested, via `FormRenderer`'s `extraSubmissionData`.

Documents' `DocumentGateProvider` and `DocumentGateDialog` are deleted; the documents page wraps itself in the shared provider with labels from its own namespace.

## 4. Payload

### Collection `journals`

```
title       text,     localized, required   — "Greece - Local Medical Journals"
slug        slugField()
country     text,     localized, required   — "Greece"
coverImage  upload → media, required
file        upload → media, required
order       number,   sidebar
publishedAt date,     sidebar
```

`defaultSort: 'order'`, drafts enabled, no SEO tab (no per-journal route). Access checklist exactly as for `documents`: `MANAGED_COLLECTIONS.journals = { label: 'Journals', publicRead: 'published' }`, `collectionAccess('journals')`, `hiddenFor('journals')`, `pnpm generate:types`, grant permissions in the admin. Plus registration in `payload.config.ts` and a `revalidateJournals` hook.

`country` is a separate field even though it is embedded in the title, because the grid will eventually need grouping or filtering by it and parsing it back out of a title string is not something to build later.

## 5. Frontend

```
_features/journals/
  api/journals.ts               fetchPublishedJournals({ locale })
  lib/journalFile.ts            Journal → DownloadItem
  ui/JournalCard.tsx            cover + title + button slot
  ui/JournalsArchive.tsx        1 / 2 / 3 column grid
  ui/JournalsCta.tsx            the closing band, own copy
  ui/JournalsListingLayout.tsx  Root / .Breadcrumbs / .Header / .Content / .Cta
  ui/DownloadJournalButton.tsx  'use client' trigger
  index.ts / client.ts
```

Route `src/app/(frontend)/[locale]/local-medical-journals/page.tsx`, thin as always: `setRequestLocale`, fetch journals and the `journal-download` form in one `Promise.all`, render into slots, `revalidate = 600`, `generateMetadata` with `buildLocaleAlternates`.

`messages/{en,uk}.json` gain a `Journals` namespace: title, subtitle, breadcrumb, `Download`, gate labels, CTA copy.

The header and footer already link to `/local-medical-journals` in both locales — it is a broken link today, so no navigation change is needed.

## 6. Content

| Country | Cover | PDF |
|---|---|---|
| Greece | `2025/12/Journals.png` | `2025/12/Local-Journals-Greece.pdf` |
| Spain | `2025/12/Journals-Spain.png` | `2025/12/Spain-Local-Journals.pdf` |
| Croatia | `2026/05/Journals-Croatia.png` | `2026/05/Croatia-Local-Journals.pdf.pdf` |

Relative to `https://drug-card.io/wp-content/uploads/`.

Two known imperfections in the source, carried over deliberately and recorded here:

- **Greece has two candidate PDFs.** `Greece1.pdf` (2 Dec, 868 KB) and `Local-Journals-Greece.pdf` (3 Dec, 984 KB) are both 13 pages and differ byte-wise — two revisions of one document. Which one the live form serves is decided server-side and is not observable from outside. The later revision is imported; switching is a one-line change in the import table.
- **The Croatia cover is 216×151**, against 500×350 for the other two, so it will look soft on high-density screens. Imported as is; regenerating it is a content task.

`scripts/import-journals.ts` (`pnpm import:journals`) mirrors the documents importer: idempotent upsert by slug, media reused by filename, `DRY_RUN=1` and `FORCE_ASSETS=1` supported, and it creates the `journal-download` form when missing.

## 7. Verification

`pnpm lint`, `pnpm build`, and a browser pass over `/en/local-medical-journals` and `/uk/local-medical-journals`: grid, gate, a real submission carrying the journal title, and a real download. The documents page is re-checked too, since its gate moved.
