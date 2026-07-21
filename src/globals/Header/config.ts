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
        link({
          appearances: false,
        }),
        {
          name: 'subItems',
          type: 'array',
          fields: [
            link({
              appearances: false,
            }),
          ],
          admin: {
            description:
              'Заполните, чтобы пункт открывал выпадающее подменю. Сам пункт остаётся кликабельной ссылкой.',
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
