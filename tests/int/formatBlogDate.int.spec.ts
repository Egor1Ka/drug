import { describe, expect, it } from 'vitest'

import { formatBlogDate } from '@/utilities/formatBlogDate'

describe('formatBlogDate', () => {
  it('formats a UTC ISO timestamp as DD/MM/YYYY', () => {
    expect(formatBlogDate('2026-07-06T16:14:03.000Z')).toBe('06/07/2026')
  })

  it('pads single-digit day and month with zeros', () => {
    expect(formatBlogDate('2026-01-03T12:00:00Z')).toBe('03/01/2026')
  })

  it('keeps the stored UTC date near a UTC day boundary', () => {
    expect(formatBlogDate('2026-07-06T23:30:00Z')).toBe('06/07/2026')
  })
})
