import React from 'react'

import { DownloadJournalButton } from './DownloadJournalButton'
import { JournalCard, type JournalCardItem } from './JournalCard'

const renderJournal = (item: JournalCardItem) => (
  <JournalCard item={item} key={item.id}>
    <DownloadJournalButton journal={item} />
  </JournalCard>
)

// Three columns on desktop, matching the original grid.
export const JournalsArchive: React.FC<{ items: JournalCardItem[] }> = ({ items }) => (
  <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
    {items.map(renderJournal)}
  </div>
)
