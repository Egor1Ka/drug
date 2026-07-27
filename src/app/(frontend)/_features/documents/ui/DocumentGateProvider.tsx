'use client'

import React, { createContext, use, useCallback, useState } from 'react'

import type { Form } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import type { DocumentCardItem } from './DocumentCard'
import { DocumentGateDialog } from './DocumentGateDialog'

type DocumentGateContextValue = {
  closeGate: () => void
  openGateFor: (document: DocumentCardItem) => void
}

const DocumentGateContext = createContext<DocumentGateContextValue>({
  closeGate: () => null,
  openGateFor: () => null,
})

export const useDocumentGate = () => use(DocumentGateContext)

type DocumentGateProviderProps = {
  children: React.ReactNode
  form: Form | null
}

// Holds the document whose gate is open. One provider serves the whole
// listing, so the ten cards share a single dialog instance instead of each
// mounting its own — which is what the original does with ten separate popups.
export const DocumentGateProvider: React.FC<DocumentGateProviderProps> = ({ children, form }) => {
  const [activeDocument, setActiveDocument] = useState<DocumentCardItem | null>(null)

  const openGateFor = useCallback(
    (document: DocumentCardItem) => setActiveDocument(document),
    [],
  )
  const closeGate = useCallback(() => setActiveDocument(null), [])

  return (
    <DocumentGateContext value={{ closeGate, openGateFor }}>
      {children}
      <Show when={activeDocument}>
        <DocumentGateDialog document={activeDocument} form={form} onClose={closeGate} />
      </Show>
    </DocumentGateContext>
  )
}
