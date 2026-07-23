import React from 'react'

import { NewsCard, type NewsCardItem } from './NewsCard'

const renderItem = (item: NewsCardItem) => <NewsCard key={item.slug} item={item} />

export const NewsArchive: React.FC<{ items: NewsCardItem[] }> = ({ items }) => (
  <div className="mx-auto max-w-[48rem] divide-y divide-border">{items.map(renderItem)}</div>
)
