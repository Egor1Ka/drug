import React from 'react'

import { DocumentCard, type DocumentCardItem } from './DocumentCard'
import { GetPdfButton } from './GetPdfButton'

const renderDocument = (item: DocumentCardItem) => (
  <DocumentCard item={item} key={item.id}>
    <GetPdfButton document={item} />
  </DocumentCard>
)

// Three columns on desktop, matching the original grid.
export const DocumentsArchive: React.FC<{ items: DocumentCardItem[] }> = ({ items }) => (
  <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
    {items.map(renderDocument)}
  </div>
)
