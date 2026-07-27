import type { CollectionConfig } from 'payload'

import { slugField } from 'payload'

import { collectionAccess, hiddenFor } from '../../access/permissions'
import { revalidateDocuments, revalidateDocumentsDelete } from './hooks/revalidateDocuments'

// Gated downloads listed on /documents (mirrors the original drug-card.io
// "Documents & Resources" page): a cover image, a short description and a PDF
// released after the visitor fills in the download form.
//
// There is no per-document route, so the collection carries no SEO tab — the
// only page these documents appear on is the listing itself.
export const Documents: CollectionConfig<'documents'> = {
  slug: 'documents',
  access: collectionAccess('documents'),
  defaultPopulate: {
    title: true,
    slug: true,
    description: true,
    coverImage: true,
    file: true,
    order: true,
  },
  // The original orders its cards by hand rather than by date, so ordering is
  // an explicit editorial field instead of a publish-date sort.
  defaultSort: 'order',
  admin: {
    defaultColumns: ['title', 'order', 'publishedAt'],
    hidden: hiddenFor('documents'),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      required: true,
      admin: {
        description: 'Short summary shown on the card, under the title.',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Card cover — usually a screenshot of the first page of the PDF.',
      },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'The PDF handed over after the download form is submitted.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Lower numbers come first in the grid.',
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidateDocuments],
    afterDelete: [revalidateDocumentsDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
