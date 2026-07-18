import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'
import { cache } from 'react'

import type { PageContent } from '@/payload-types'

// Primitive arguments keep React cache() memoization working across
// the page render and generateMetadata — one DB hit per request.
export const fetchPageContent = cache(async (pageKey: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'page-content',
    limit: 1,
    locale,
    overrideAccess: false,
    pagination: false,
    where: {
      pageKey: {
        equals: pageKey,
      },
    },
  })

  return result.docs?.[0] || null
})

type SectionBlock = NonNullable<PageContent['sections']>[number]
type SectionBlockType = SectionBlock['blockType']
type SectionOf<BlockType extends SectionBlockType> = Extract<SectionBlock, { blockType: BlockType }>

const sectionOfType =
  <BlockType extends SectionBlockType>(blockType: BlockType) =>
  (content: PageContent | null, sectionKey: string): SectionOf<BlockType> | null => {
    if (!content || !content.sections) return null

    const matchesSection = (section: SectionBlock): section is SectionOf<BlockType> =>
      section.blockType === blockType && section.sectionKey === sectionKey

    return content.sections.find(matchesSection) || null
  }

export const getFaqSection = sectionOfType('faq')
export const getTestimonialsSection = sectionOfType('testimonials')
export const getLogosSection = sectionOfType('logos')
export const getStatsSection = sectionOfType('stats')
export const getTeamSection = sectionOfType('team')
