import type { DownloadItem } from '@frontend/_shared/ui/DownloadGate'

import type { DocumentCardItem } from '../ui/DocumentCard'

// The upload field arrives either populated (depth >= 1) or as a bare id.
const fileUrlOf = (document: DocumentCardItem): string | null => {
  const { file } = document

  if (!file || typeof file !== 'object') return null

  return file.url || null
}

// Pure view-model mapping: a document as the shared download gate sees it.
// No data access, no JSX.
export const toDownloadItem = (document: DocumentCardItem): DownloadItem => ({
  fileUrl: fileUrlOf(document),
  title: document.title,
})
