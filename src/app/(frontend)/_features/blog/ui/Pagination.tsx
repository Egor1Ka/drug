'use client'
import {
  Pagination as PaginationComponent,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/utilities/ui'
import { useRouter } from 'next/navigation'
import React from 'react'

import { buildPageTokens, type PageToken } from '../lib/paginationTokens'

const DEFAULT_HREF_PATTERN = '/blog/page/{page}'

export const Pagination: React.FC<{
  className?: string
  hrefPattern?: string
  page: number
  totalPages: number
}> = (props) => {
  const router = useRouter()

  const { className, hrefPattern = DEFAULT_HREF_PATTERN, page, totalPages } = props
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  const hrefFor = (targetPage: number): string =>
    hrefPattern.replace('{page}', String(targetPage))
  const goTo = (targetPage: number) => () => router.push(hrefFor(targetPage))

  const renderToken = (token: PageToken) => {
    if (token.type === 'gap' || token.page === undefined) {
      return (
        <PaginationItem key={token.key}>
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    return (
      <PaginationItem key={token.key}>
        <PaginationLink isActive={token.page === page} onClick={goTo(token.page)}>
          {token.page}
        </PaginationLink>
      </PaginationItem>
    )
  }

  return (
    <div className={cn('my-12', className)}>
      <PaginationComponent>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious disabled={!hasPrevPage} onClick={goTo(page - 1)} />
          </PaginationItem>

          {buildPageTokens(page, totalPages).map(renderToken)}

          <PaginationItem>
            <PaginationNext disabled={!hasNextPage} onClick={goTo(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </PaginationComponent>
    </div>
  )
}
