import type { CollectionConfig } from 'payload'

import { collectionAccess, hiddenFor } from '../access/permissions'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: collectionAccess('categories'),
  admin: {
    hidden: hiddenFor('categories'),
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
