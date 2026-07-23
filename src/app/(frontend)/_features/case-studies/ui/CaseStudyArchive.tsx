import React from 'react'

import { CaseStudyCard, type CaseStudyCardItem } from './CaseStudyCard'

const renderItem = (item: CaseStudyCardItem) => <CaseStudyCard key={item.slug} item={item} />

export const CaseStudyArchive: React.FC<{ items: CaseStudyCardItem[] }> = ({ items }) => (
  <div className="mx-auto max-w-[48rem] divide-y divide-border">{items.map(renderItem)}</div>
)
