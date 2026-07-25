// Pure view-model for the pagination control: which page numbers are visible
// and where the gap ellipses go. No React, no routing — plain data in/out.

export type PageToken = { key: string; page?: number; type: 'gap' | 'page' }

const byAscending = (a: number, b: number) => a - b

const toGapToken = (beforePage: number): PageToken => ({ key: `gap-${beforePage}`, type: 'gap' })

const toPageToken = (page: number): PageToken => ({ key: `page-${page}`, page, type: 'page' })

const addPageWithGap = (tokens: PageToken[], visiblePage: number): PageToken[] => {
  const previous = tokens[tokens.length - 1]
  const hasGap = Boolean(previous) && previous.page !== undefined && visiblePage - previous.page > 1

  return hasGap
    ? [...tokens, toGapToken(visiblePage), toPageToken(visiblePage)]
    : [...tokens, toPageToken(visiblePage)]
}

// First and last pages are always visible ("1 … 4 5 6 … 17"), so the visitor
// sees the total size and can jump to either end.
export const buildPageTokens = (page: number, totalPages: number): PageToken[] => {
  const isWithinRange = (candidate: number) => candidate >= 1 && candidate <= totalPages
  const candidates = [1, page - 1, page, page + 1, totalPages].filter(isWithinRange)
  const visiblePages = [...new Set(candidates)].sort(byAscending)

  return visiblePages.reduce(addPageWithGap, [])
}
