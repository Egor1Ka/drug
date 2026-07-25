import React from 'react'

import { NewsCard, type NewsCardItem } from './NewsCard'

const renderItem = (item: NewsCardItem) => <NewsCard key={item.slug} item={item} />

export const NewsArchive: React.FC<{ items: NewsCardItem[] }> = ({ items }) => (
  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">{items.map(renderItem)}</div>
)
