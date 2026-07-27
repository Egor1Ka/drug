import { describe, expect, it } from 'vitest'

import type { PageContent } from '@/payload-types'

import { buildPageMetadata } from '@frontend/_features/page-content/api/pageMetadata'

const fallback = { title: 'Fallback Title', description: 'Fallback Description' }
const location = { locale: 'en' as const, path: '/documents' }

const ogImages = (metadata: ReturnType<typeof buildPageMetadata>) =>
  (metadata.openGraph?.images as { url: string }[]) ?? []

describe('buildPageMetadata', () => {
  it('uses CMS meta when present', () => {
    const content = {
      meta: { title: 'CMS Title', description: 'CMS Description' },
    } as unknown as PageContent

    const result = buildPageMetadata(content, fallback, location)

    expect(result.title).toBe('CMS Title')
    expect(result.description).toBe('CMS Description')
  })

  it('falls back to i18n values when meta is missing', () => {
    const result = buildPageMetadata(null, fallback, location)

    expect(result.title).toBe('Fallback Title')
    expect(result.description).toBe('Fallback Description')
  })

  it('falls back per-field when a single meta field is empty', () => {
    const content = { meta: { title: 'CMS Title' } } as unknown as PageContent

    const result = buildPageMetadata(content, fallback, location)

    expect(result.title).toBe('CMS Title')
    expect(result.description).toBe('Fallback Description')
  })

  it('maps a media image to an absolute OG url', () => {
    const content = {
      meta: { title: 'CMS Title', image: { url: '/media/hero.png' } },
    } as unknown as PageContent

    const result = buildPageMetadata(content, fallback, location)

    expect(ogImages(result)[0]?.url).toContain('/media/hero.png')
  })

  // Regression guard: pages that emitted only title/description inherited the
  // layout's generic og:title and no image at all, which is what made shared
  // links render as a bare text row.
  it('always emits an Open Graph block, even with no CMS content', () => {
    const result = buildPageMetadata(null, fallback, location)

    expect(result.openGraph?.title).toBe('Fallback Title')
    expect(result.openGraph?.description).toBe('Fallback Description')
    expect(ogImages(result)[0]?.url).toBe('/og-default.png')
  })

  it('sets the canonical and Open Graph url from the page location', () => {
    const result = buildPageMetadata(null, fallback, location)

    expect(String(result.alternates?.canonical)).toContain('/en/documents')
    expect(String(result.openGraph?.url)).toContain('/en/documents')
  })
})
