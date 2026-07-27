'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { useDownloadGate } from '@frontend/_shared/ui/DownloadGate'

import type { JournalCardItem } from './JournalCard'
import { toDownloadItem } from '../lib/journalFile'

// The card's only interactive element: opens the shared gate for this journal.
export const DownloadJournalButton: React.FC<{ journal: JournalCardItem }> = ({ journal }) => {
  const t = useTranslations('Journals')
  const { openGateFor } = useDownloadGate()

  const openOwnGate = () => openGateFor(toDownloadItem(journal))

  return (
    <button
      className="cursor-pointer rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      onClick={openOwnGate}
      type="button"
    >
      {t('download')}
    </button>
  )
}
