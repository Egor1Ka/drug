import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { metaTab } from '@/fields/metaTab'
import { FaqSection, LogosSection, StatsSection, TeamSection, TestimonialsSection } from './blocks'
import { revalidatePageContent, revalidatePageContentDelete } from './hooks/revalidatePageContent'
import { validateUniqueSectionKeys } from './validateUniqueSectionKeys'

export const PageContent: CollectionConfig<'page-content'> = {
  slug: 'page-content',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['pageKey', 'updatedAt'],
    description:
      'Editable content for hand-coded pages. One document per page; the page code places sections by their keys — block order here does not affect the layout.',
    useAsTitle: 'pageKey',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'pageKey',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: {
                description:
                  "Route identifier: 'home' → /, otherwise /<pageKey> (e.g. 'pricing' → /pricing)",
              },
            },
            {
              name: 'sections',
              type: 'blocks',
              blocks: [FaqSection, TestimonialsSection, LogosSection, StatsSection, TeamSection],
              validate: validateUniqueSectionKeys,
              admin: {
                initCollapsed: true,
              },
            },
          ],
        },
        metaTab,
      ],
    },
  ],
  hooks: {
    afterChange: [revalidatePageContent],
    afterDelete: [revalidatePageContentDelete],
  },
}
