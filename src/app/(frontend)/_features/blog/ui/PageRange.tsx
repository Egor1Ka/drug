import { useTranslations } from 'next-intl'
import React from 'react'

import { cn } from '@/utilities/ui'

type PageRangeProps = {
  className?: string
  currentPage?: number
  limit?: number
  totalDocs?: number
}

// Текст диапазона (и plural-формы) живёт в messages/*.json — Blog.showingRange
// и Blog.noResults, а не в компоненте.
export const PageRange: React.FC<PageRangeProps> = ({
  className,
  currentPage,
  limit,
  totalDocs,
}) => {
  const t = useTranslations('Blog')

  if (!totalDocs) return <div className={cn(className, 'font-semibold')}>{t('noResults')}</div>

  const page = currentPage || 1
  const perPage = limit || 1
  const from = Math.min((page - 1) * perPage + 1, totalDocs)
  const to = Math.min(page * perPage, totalDocs)

  return (
    <div className={cn(className, 'font-semibold')}>
      {t('showingRange', { from, to, total: totalDocs })}
    </div>
  )
}
