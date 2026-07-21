import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'contacts',
      type: 'group',
      fields: [
        { name: 'address', type: 'textarea', localized: true },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'tagline', type: 'text', localized: true },
      ],
    },
    {
      name: 'linkColumns',
      type: 'array',
      localized: true,
      maxRows: 4,
      fields: [
        { name: 'title', type: 'text' },
        {
          name: 'links',
          type: 'array',
          fields: [
            link({
              appearances: false,
              customOnly: true,
            }),
          ],
        },
      ],
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/globals/Footer/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'socials',
      type: 'array',
      // НЕ локализовано: ссылки на соцсети одни и те же на всех языках.
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: [
            { label: 'Telegram', value: 'telegram' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'X', value: 'x' },
          ],
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'newsletter',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', localized: true },
        {
          name: 'form',
          type: 'relationship',
          relationTo: 'forms',
          admin: {
            description: 'Не выбрана — блок подписки на сайте не показывается.',
          },
        },
      ],
    },
    {
      name: 'legal',
      type: 'group',
      fields: [
        { name: 'copyright', type: 'text', localized: true },
        {
          name: 'legalLinks',
          type: 'array',
          localized: true,
          fields: [
            link({
              appearances: false,
              customOnly: true,
            }),
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
