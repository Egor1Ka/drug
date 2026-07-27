import type { DocumentCardItem } from '../ui/DocumentCard'

// The upload field arrives either populated (depth >= 1) or as a bare id.
// Pure view-model helper: no data access, no JSX — the dialog only asks for a
// URL and gets null when the relationship was not populated.
export const resolveDocumentFileUrl = (document: DocumentCardItem): string | null => {
  const { file } = document

  if (!file || typeof file !== 'object') return null

  return file.url || null
}
