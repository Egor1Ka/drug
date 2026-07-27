'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import type { DocumentCardItem } from './DocumentCard'
import { useDocumentGate } from './DocumentGateProvider'

// The card's only interactive element: opens the shared gate for this document.
export const GetPdfButton: React.FC<{ document: DocumentCardItem }> = ({ document }) => {
  const t = useTranslations('Documents')
  const { openGateFor } = useDocumentGate()

  const openOwnGate = () => openGateFor(document)

  return (
    <button
      className="cursor-pointer rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      onClick={openOwnGate}
      type="button"
    >
      {t('getPdf')}
    </button>
  )
}
