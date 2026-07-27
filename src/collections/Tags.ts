import type { CollectionConfig } from 'payload'

import { collectionAccess, hiddenFor } from '../access/permissions'
import { slugField } from 'payload'

export const Tags: CollectionConfig = {
  slug: 'tags',
  access: collectionAccess('tags'),
  admin: {
    hidden: hiddenFor('tags'),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    slugField({
      position: undefined,
    }),
  ],
}
