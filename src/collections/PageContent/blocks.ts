import type { Block, Field } from 'payload'

// Contract with the page code: sections are looked up by `pageKey` + `sectionKey`.
// The order of blocks in the admin has no effect on rendering — placement is
// decided by the hand-coded page, this collection only supplies content.
const sectionKeyField: Field = {
  name: 'sectionKey',
  type: 'text',
  required: true,
  admin: {
    description:
      'Identifier the page code uses to place this section (e.g. "faq-main"). A block whose key is not expected by the page code will not be rendered.',
  },
}

const localizedHeadingField: Field = {
  name: 'heading',
  type: 'text',
  localized: true,
}

export const FaqSection: Block = {
  slug: 'faq',
  interfaceName: 'FaqSectionBlock',
  labels: { singular: 'FAQ section', plural: 'FAQ sections' },
  fields: [
    sectionKeyField,
    localizedHeadingField,
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', localized: true, required: true },
        { name: 'answer', type: 'richText', localized: true, required: true },
      ],
    },
  ],
}

export const TestimonialsSection: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsSectionBlock',
  labels: { singular: 'Testimonials section', plural: 'Testimonials sections' },
  fields: [
    sectionKeyField,
    localizedHeadingField,
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'quote', type: 'textarea', localized: true, required: true },
        { name: 'authorName', type: 'text', required: true },
        { name: 'authorRole', type: 'text', localized: true },
        { name: 'photo', type: 'upload', relationTo: 'media' },
        { name: 'link', type: 'text' },
      ],
    },
  ],
}

export const LogosSection: Block = {
  slug: 'logos',
  interfaceName: 'LogosSectionBlock',
  labels: { singular: 'Logos section', plural: 'Logos sections' },
  fields: [
    sectionKeyField,
    localizedHeadingField,
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media', required: true },
        { name: 'link', type: 'text' },
      ],
    },
  ],
}

export const StatsSection: Block = {
  slug: 'stats',
  interfaceName: 'StatsSectionBlock',
  labels: { singular: 'Stats section', plural: 'Stats sections' },
  fields: [
    sectionKeyField,
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "100+" or "60%"' },
        },
        { name: 'label', type: 'text', localized: true, required: true },
        { name: 'sublabel', type: 'text', localized: true },
      ],
    },
  ],
}

export const TeamSection: Block = {
  slug: 'team',
  interfaceName: 'TeamSectionBlock',
  labels: { singular: 'Team section', plural: 'Team sections' },
  fields: [
    sectionKeyField,
    localizedHeadingField,
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'text', localized: true, required: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'photo', type: 'upload', relationTo: 'media' },
        { name: 'linkedinUrl', type: 'text' },
      ],
    },
  ],
}
