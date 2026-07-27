import type { CollectionConfig } from 'payload'

import { slugField } from 'payload'

import { collectionAccess, hiddenFor } from '../../access/permissions'
import { revalidateJournals, revalidateJournalsDelete } from './hooks/revalidateJournals'

// Country-by-country lists of the local medical journals DrugCard already
// covers, gated behind a lead form (mirrors the original drug-card.io
// "Local Medical Journals" page).
//
// Kept apart from `documents` on purpose: a journal list is a growing,
// country-keyed catalogue, while a document is a one-off marketing asset.
// There is no per-journal route, so the collection carries no SEO tab.
export const Journals: CollectionConfig<'journals'> = {
  slug: 'journals',
  access: collectionAccess('journals'),
  defaultPopulate: {
    title: true,
    slug: true,
    country: true,
    coverImage: true,
    file: true,
    order: true,
  },
  // Curated order, like the original — not a publish-date sort.
  defaultSort: 'order',
  admin: {
    defaultColumns: ['title', 'country', 'order'],
    hidden: hiddenFor('journals'),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      admin: {
        description: 'Card heading, e.g. "Greece - Local Medical Journals".',
      },
    },
    {
      name: 'country',
      type: 'text',
      localized: true,
      required: true,
      admin: {
        description:
          'Country on its own, e.g. "Greece". Stored separately from the title so the list can later be grouped or filtered without parsing headings.',
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
    afterChange: [revalidateJournals],
    afterDelete: [revalidateJournalsDelete],
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
