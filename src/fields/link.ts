import type { Field, GroupField } from 'payload'

import deepMerge from '@/utilities/deepMerge'

export type LinkAppearances = 'default' | 'outline'

export const appearanceOptions: Record<LinkAppearances, { label: string; value: string }> = {
  default: {
    label: 'Default',
    value: 'default',
  },
  outline: {
    label: 'Outline',
    value: 'outline',
  },
}

type LinkType = (options?: {
  appearances?: LinkAppearances[] | false
  disableLabel?: boolean
  overrides?: Partial<GroupField>
  // customOnly hides the Internal/Custom "type" radio and locks the link to a
  // Custom URL — editors only ever see one URL field, no internal-reference mode.
  customOnly?: boolean
  // optionalURL lets the Custom URL be blank, e.g. a nav parent that is not a
  // link itself but only opens its sub-menu.
  optionalURL?: boolean
}) => Field

export const link: LinkType = ({
  appearances,
  disableLabel = false,
  overrides = {},
  customOnly = false,
  optionalURL = false,
} = {}) => {
  const newTabField: Field = {
    name: 'newTab',
    type: 'checkbox',
    admin: {
      style: {
        alignSelf: 'flex-end',
      },
      width: customOnly ? '100%' : '50%',
    },
    label: 'Open in new tab',
  }

  // The type field always exists (so stored data keeps type: 'custom'), but in
  // customOnly mode it is hidden and defaults to custom.
  const typeField: Field = {
    name: 'type',
    type: 'radio',
    admin: customOnly
      ? { hidden: true }
      : {
          layout: 'horizontal',
          width: '50%',
        },
    defaultValue: customOnly ? 'custom' : 'reference',
    options: [
      {
        label: 'Internal link',
        value: 'reference',
      },
      {
        label: 'Custom URL',
        value: 'custom',
      },
    ],
  }

  const linkResult: GroupField = {
    name: 'link',
    type: 'group',
    admin: {
      hideGutter: true,
    },
    fields: customOnly
      ? [typeField, { type: 'row', fields: [newTabField] }]
      : [{ type: 'row', fields: [typeField, newTabField] }],
  }

  const referenceField: Field = {
    name: 'reference',
    type: 'relationship',
    admin: {
      condition: (_, siblingData) => siblingData?.type === 'reference',
    },
    label: 'Document to link to',
    relationTo: ['posts'],
    required: true,
  }

  const urlField: Field = {
    name: 'url',
    type: 'text',
    admin: customOnly
      ? {}
      : {
          condition: (_, siblingData) => siblingData?.type === 'custom',
        },
    label: 'Custom URL',
    required: !optionalURL,
  }

  const linkTypes: Field[] = customOnly ? [urlField] : [referenceField, urlField]

  if (!disableLabel) {
    linkTypes.map((linkType) => ({
      ...linkType,
      admin: {
        ...linkType.admin,
        width: '50%',
      },
    }))

    linkResult.fields.push({
      type: 'row',
      fields: [
        ...linkTypes,
        {
          name: 'label',
          type: 'text',
          admin: {
            width: '50%',
          },
          label: 'Label',
          required: true,
        },
      ],
    })
  } else {
    linkResult.fields = [...linkResult.fields, ...linkTypes]
  }

  if (appearances !== false) {
    let appearanceOptionsToUse = [appearanceOptions.default, appearanceOptions.outline]

    if (appearances) {
      appearanceOptionsToUse = appearances.map((appearance) => appearanceOptions[appearance])
    }

    linkResult.fields.push({
      name: 'appearance',
      type: 'select',
      admin: {
        description: 'Choose how the link should be rendered.',
      },
      defaultValue: 'default',
      options: appearanceOptionsToUse,
    })
  }

  return deepMerge(linkResult, overrides)
}
