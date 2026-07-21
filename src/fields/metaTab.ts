import type { Field, Tab } from 'payload'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

// The SEO field set shared by every collection that surfaces metadata.
// Kept in one place so `pages`, `page-content` (and future collections) never
// drift apart. Extracted verbatim from the original inline `pages` SEO tab.
export const metaFields: Field[] = [
  OverviewField({
    titlePath: 'meta.title',
    descriptionPath: 'meta.description',
    imagePath: 'meta.image',
  }),
  MetaTitleField({
    hasGenerateFn: true,
    overrides: {
      localized: true,
    },
  }),
  MetaImageField({
    relationTo: 'media',
  }),
  MetaDescriptionField({
    overrides: {
      localized: true,
    },
  }),
  PreviewField({
    hasGenerateFn: true,
    titlePath: 'meta.title',
    descriptionPath: 'meta.description',
  }),
]

// A ready-to-drop `Tab` for collections that use a `tabs` field.
export const metaTab: Tab = {
  name: 'meta',
  label: 'SEO',
  fields: metaFields,
}
