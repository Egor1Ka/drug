import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      // Весь массив локализован: структура меню может отличаться между
      // локалями (например, пункт «БПР» существует только в uk).
      localized: true,
      maxRows: 8,
      fields: [
        // Custom URL only. URL is optional: leave it blank to make the item a
        // non-clickable parent that just opens its sub-menu (like «Solution»).
        link({
          appearances: false,
          customOnly: true,
          optionalURL: true,
        }),
        {
          name: 'subItems',
          type: 'array',
          fields: [
            link({
              appearances: false,
              customOnly: true,
            }),
          ],
          admin: {
            description:
              'Заполните, чтобы пункт открывал выпадающее подменю. Если оставить URL пункта пустым — он станет некликабельным и будет только открывать это подменю.',
            initCollapsed: true,
          },
        },
      ],
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/globals/Header/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'ctaButtons',
      type: 'group',
      fields: [
        link({
          appearances: false,
          customOnly: true,
          overrides: {
            name: 'loginButton',
            // Группа локализована целиком: en может вести на /login/en,
            // uk — на /login/ua, с разными подписями.
            localized: true,
            label: 'Log In button',
          },
        }),
        {
          name: 'demoButtonLabel',
          type: 'text',
          localized: true,
          label: 'Request a Demo button label',
          admin: {
            description: 'Кнопка без ссылки — открывает контактную модалку.',
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
