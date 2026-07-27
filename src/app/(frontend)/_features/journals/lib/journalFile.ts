import type { DownloadItem } from '@frontend/_shared/ui/DownloadGate'

import type { JournalCardItem } from '../ui/JournalCard'

// The upload field arrives either populated (depth >= 1) or as a bare id.
const fileUrlOf = (journal: JournalCardItem): string | null => {
  const { file } = journal

  if (!file || typeof file !== 'object') return null

  return file.url || null
}

// Pure view-model mapping: a journal as the shared download gate sees it.
// No data access, no JSX.
export const toDownloadItem = (journal: JournalCardItem): DownloadItem => ({
  fileUrl: fileUrlOf(journal),
  title: journal.title,
})
