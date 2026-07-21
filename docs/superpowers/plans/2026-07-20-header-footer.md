# Header & Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Скопировать хедер и футер drug-card.io и сделать весь их контент редактируемым из админки Payload на обоих языках (en/uk).

**Architecture:** Два структурированных Payload-глобала (`header`, `footer`) с локализованными массивами хранят весь контент. Новая FSD-фича `src/app/(frontend)/_features/layout/` читает их через `getCachedGlobal` и рендерит презентационными компонентами со слот-лейаутами. Старые шаблонные компоненты из `src/globals/*/Component*.tsx` удаляются; `config.ts` и revalidate-хуки остаются.

**Tech Stack:** Payload CMS 3 (MongoDB), Next.js App Router (RSC), next-intl, Tailwind, vitest + @testing-library/react, Playwright.

**Спека:** `docs/superpowers/specs/2026-07-20-header-footer-design.md`

## Global Constraints

- **Коммиты делает пользователь сам.** Исполнитель НЕ выполняет `git commit`. Каждая задача завершается `git add <файлы>` и остановкой на ревью.
- **Локали:** ровно `en` и `uk`, defaultLocale `en`, `fallback: true`. Список локалей — `src/i18n/routing.ts` (источник правды) и `localization.locales` в `src/payload.config.ts`; они должны совпадать.
- **Стиль кода (обязателен, из `~/.claude/rules`):** только `const`, без `let`; без `for`/`while` — `map`/`filter`/`reduce`; все колбэки — именованные функции, инлайн-лямбды с логикой запрещены; без мутаций аргументов; guard clause до вызова, без `?.` внутри guard-проверок; конфиг-объекты вместо `if`/`switch`-цепочек.
- **React-конвенции проекта (`CLAUDE.md`):** компоненты — только view; данные только через `api/` фичи; позиционирование только в layout-компонентах со слотами через `Object.assign`; условный рендер через `<Show when={...}>` из `@frontend/_shared/ui/Show`, а не `&&`/тернарники; роуты импортируют только из корня фичи (`index.ts`).
- **Импорты:** `@/*` → `src/*`, `@frontend/*` → `src/app/(frontend)/*`.
- **Новые библиотеки не ставим.** Иконки соцсетей — инлайн-SVG в проекте.
- **Тесты:** vitest, файлы строго `tests/int/**/*.int.spec.ts` (иначе не подхватятся конфигом). Импорт хелперов из `vitest` явный (`import { describe, expect, it } from 'vitest'`) — `globals` НЕ включены, поэтому RTL-автоочистка не работает: в компонентных тестах вызывать `afterEach(cleanup)` вручную. `@testing-library/jest-dom` НЕ установлен — использовать обычные матчеры (`toBeTruthy()`, `toBeNull()`, `toBe()`), а не `toBeInTheDocument()`.
- **Команды:** `pnpm generate:types`, `pnpm lint`, `pnpm test:int`, targeted-прогон одного файла: `pnpm exec vitest run --config ./vitest.config.mts tests/int/<файл>.int.spec.ts`.
- **После КАЖДОГО изменения схемы Payload** — `pnpm generate:types` перед написанием фронтенд-кода, иначе типов не будет.

---

### Task 1: Схема глобала Header

**Files:**
- Modify: `src/globals/Header/config.ts` (полностью переписывается)
- Modify: `src/globals/Header/RowLabel.tsx:7-13`

**Interfaces:**
- Produces: тип `Header` в `src/payload-types.ts` с полями `navItems[]` (`link`, `subItems[]`) и `ctaButtons` (`loginButton`, `demoButtonLabel`). На этот тип опираются Задачи 4–8.

- [ ] **Step 1: Переписать конфиг глобала**

Файл `src/globals/Header/config.ts` целиком:

```ts
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
```

- [ ] **Step 2: Обновить RowLabel под подменю**

Файл `src/globals/Header/RowLabel.tsx` целиком:

```tsx
'use client'
import { Header } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

type NavItem = NonNullable<Header['navItems']>[number]

const subItemsSuffix = (item: NavItem) => {
  const count = item.subItems ? item.subItems.length : 0

  if (!count) return ''

  return ` (${count})`
}

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NavItem>()
  const item = data?.data

  if (!item || !item.link || !item.link.label) return <div>Row</div>

  const position = data.rowNumber !== undefined ? data.rowNumber + 1 : ''

  return (
    <div>{`Nav item ${position}: ${item.link.label}${subItemsSuffix(item)}`}</div>
  )
}
```

- [ ] **Step 3: Перегенерировать типы**

Run: `pnpm generate:types`
Expected: команда завершается без ошибок; в `src/payload-types.ts` у интерфейса `Header` появились `subItems` и `ctaButtons`.

- [ ] **Step 4: Проверить, что типы действительно на месте**

Run: `grep -n "subItems\|ctaButtons\|demoButtonLabel" src/payload-types.ts | head -20`
Expected: непустой вывод со всеми тремя именами.

- [ ] **Step 5: Линт**

Run: `pnpm lint`
Expected: без ошибок в изменённых файлах.

- [ ] **Step 6: Застейджить и остановиться на ревью**

```bash
git add src/globals/Header/config.ts src/globals/Header/RowLabel.tsx src/payload-types.ts
```

Коммит НЕ делать — пользователь коммитит сам.

---

### Task 2: Схема глобала Footer

**Files:**
- Modify: `src/globals/Footer/config.ts` (полностью переписывается)
- Modify: `src/globals/Footer/RowLabel.tsx` (полностью переписывается — теперь метит колонки ссылок)

**Interfaces:**
- Consumes: `link()` из `@/fields/link` (как в Задаче 1).
- Produces: тип `Footer` в `src/payload-types.ts` с полями `contacts`, `linkColumns[]`, `socials[]`, `newsletter`, `legal`. На него опираются Задачи 9–12.

- [ ] **Step 1: Переписать конфиг глобала**

Файл `src/globals/Footer/config.ts` целиком:

```ts
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
```

- [ ] **Step 2: Переписать RowLabel под колонки**

Файл `src/globals/Footer/RowLabel.tsx` целиком:

```tsx
'use client'
import { Footer } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

type LinkColumn = NonNullable<Footer['linkColumns']>[number]

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<LinkColumn>()
  const column = data?.data

  if (!column || !column.title) return <div>Column</div>

  const linksCount = column.links ? column.links.length : 0

  return <div>{`${column.title} (${linksCount})`}</div>
}
```

- [ ] **Step 3: Перегенерировать типы**

Run: `pnpm generate:types`
Expected: без ошибок.

- [ ] **Step 4: Проверить типы**

Run: `grep -n "linkColumns\|newsletter\|legalLinks" src/payload-types.ts | head -20`
Expected: непустой вывод со всеми тремя именами.

- [ ] **Step 5: Линт**

Run: `pnpm lint`
Expected: без ошибок.

- [ ] **Step 6: Застейджить**

```bash
git add src/globals/Footer/config.ts src/globals/Footer/RowLabel.tsx src/payload-types.ts
```

---

### Task 3: Логотип DrugCard

Шаблонный `src/components/Logo/Logo.tsx` рендерит логотип Payload с GitHub-URL. Для копии нужен логотип DrugCard в двух вариантах: цветной (белый хедер) и белый (тёмный футер).

**Files:**
- Create: `public/logo-drugcard.svg` (цветной)
- Create: `public/logo-drugcard-white.svg` (белый)
- Create: `src/app/(frontend)/_features/layout/ui/SiteLogo.tsx`
- Modify: `vitest.config.mts` (разрешить `.tsx`-тесты — это первый тест с JSX в проекте)
- Test: `tests/int/siteLogo.int.spec.tsx`

**Interfaces:**
- Produces: `SiteLogo: React.FC<{ variant?: 'color' | 'white'; className?: string; priority?: boolean }>` — рендерит `<img>` с логотипом. Используется в Задачах 8 и 9.

- [ ] **Step 1: Скачать оба SVG в public/**

```bash
curl -sL -o public/logo-drugcard.svg "https://drug-card.io/wp-content/uploads/2022/10/DrugCard-logo-final-1-1.svg"
curl -sL -o public/logo-drugcard-white.svg "https://drug-card.io/wp-content/uploads/2018/07/Logo-d.c-white-1.svg"
```

Expected: оба файла созданы и непустые. Проверить: `head -c 100 public/logo-drugcard.svg` — должен начинаться с `<svg` или `<?xml`.

Если curl вернул пустой файл или HTML вместо SVG (сайт мог сменить URL) — остановиться и сообщить пользователю, не выдумывать замену.

- [ ] **Step 2: Разрешить .tsx-тесты в конфиге vitest**

Существующий `include` покрывает только `.ts`, а тесты компонентов содержат JSX и обязаны быть `.tsx` (esbuild не парсит JSX в `.ts`). В `vitest.config.mts` заменить строку `include`:

```ts
    include: ['tests/int/**/*.int.spec.ts', 'tests/int/**/*.int.spec.tsx'],
```

- [ ] **Step 3: Написать падающий тест**

Файл `tests/int/siteLogo.int.spec.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { SiteLogo } from '@frontend/_features/layout/ui/SiteLogo'

afterEach(cleanup)

describe('SiteLogo', () => {
  it('renders the colored logo by default', () => {
    render(<SiteLogo />)

    const image = screen.getByAltText('DrugCard') as HTMLImageElement

    expect(image.getAttribute('src')).toBe('/logo-drugcard.svg')
  })

  it('renders the white logo for the white variant', () => {
    render(<SiteLogo variant="white" />)

    const image = screen.getByAltText('DrugCard') as HTMLImageElement

    expect(image.getAttribute('src')).toBe('/logo-drugcard-white.svg')
  })

  it('merges a custom className', () => {
    render(<SiteLogo className="h-6" />)

    const image = screen.getByAltText('DrugCard')

    expect(image.className.includes('h-6')).toBe(true)
  })
})
```

- [ ] **Step 4: Запустить тест — должен упасть**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/siteLogo.int.spec.tsx`
Expected: FAIL — `Failed to resolve import "@frontend/_features/layout/ui/SiteLogo"`.

Если вместо этого vitest пишет «No test files found» — не подхватился `include` из Step 2, вернуться и проверить правку конфига.

- [ ] **Step 5: Реализовать SiteLogo**

Файл `src/app/(frontend)/_features/layout/ui/SiteLogo.tsx`:

```tsx
import clsx from 'clsx'
import React from 'react'

type LogoVariant = 'color' | 'white'

const LOGO_SOURCES: Record<LogoVariant, string> = {
  color: '/logo-drugcard.svg',
  white: '/logo-drugcard-white.svg',
}

type SiteLogoProps = {
  className?: string
  priority?: boolean
  variant?: LogoVariant
}

export const SiteLogo: React.FC<SiteLogoProps> = ({
  className,
  priority = false,
  variant = 'color',
}) => (
  /* eslint-disable-next-line @next/next/no-img-element */
  <img
    alt="DrugCard"
    className={clsx('h-9 w-auto', className)}
    decoding="async"
    fetchPriority={priority ? 'high' : 'auto'}
    loading={priority ? 'eager' : 'lazy'}
    src={LOGO_SOURCES[variant]}
  />
)
```

- [ ] **Step 6: Запустить тест — должен пройти**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/siteLogo.int.spec.tsx`
Expected: PASS, 3 теста.

- [ ] **Step 7: Застейджить**

```bash
git add vitest.config.mts public/logo-drugcard.svg public/logo-drugcard-white.svg src/app/\(frontend\)/_features/layout/ui/SiteLogo.tsx tests/int/siteLogo.int.spec.tsx
```

---

### Task 4: Слой данных фичи layout + строки i18n

**Files:**
- Create: `src/app/(frontend)/_features/layout/api/header.ts`
- Create: `src/app/(frontend)/_features/layout/api/footer.ts`
- Create: `src/app/(frontend)/_features/layout/index.ts`
- Modify: `messages/en.json`
- Modify: `messages/uk.json`

**Interfaces:**
- Consumes: `getCachedGlobal(slug, depth, locale)` из `@/utilities/getGlobals`.
- Produces:
  - `fetchHeaderData(locale: TypedLocale): Promise<Header>`
  - `fetchFooterData(locale: TypedLocale): Promise<Footer>`
  - публичный API фичи `index.ts` — сейчас пустой заглушкой, наполняется в Задачах 8 и 12.
  - namespace `Layout` в messages со системными строками.

- [ ] **Step 1: Создать api/header.ts**

```ts
import type { TypedLocale } from 'payload'

import { getCachedGlobal } from '@/utilities/getGlobals'

// depth 1 нужен, чтобы резолвились reference-ссылки (pages/posts) внутри
// link-полей меню. Тег кеша global_header инвалидирует revalidateHeader.
export const fetchHeaderData = (locale: TypedLocale) => getCachedGlobal('header', 1, locale)()
```

- [ ] **Step 2: Создать api/footer.ts**

```ts
import type { TypedLocale } from 'payload'

import { getCachedGlobal } from '@/utilities/getGlobals'

// depth 1 резолвит и reference-ссылки в колонках, и relationship
// newsletter.form (нужен id формы и её поля для блока подписки).
export const fetchFooterData = (locale: TypedLocale) => getCachedGlobal('footer', 1, locale)()
```

- [ ] **Step 3: Создать index.ts (публичный API, пока пустой)**

```ts
export {}
```

Наполняется в Задачах 8 (`SiteHeader`) и 12 (`SiteFooter`).

- [ ] **Step 4: Добавить namespace Layout в messages/en.json**

Добавить на верхнем уровне объекта (рядом с `"Blog"`, `"ContactModal"`, `"Home"`):

```json
  "Layout": {
    "openMenu": "Open menu",
    "closeMenu": "Close menu",
    "toggleSubmenu": "Toggle submenu",
    "switchLanguage": "Switch language",
    "newsletterPlaceholder": "Your email",
    "newsletterSubmit": "Subscribe",
    "newsletterSending": "Sending...",
    "newsletterError": "Something went wrong. Please try again.",
    "newsletterSuccess": "Thank you for subscribing!"
  },
```

- [ ] **Step 5: Добавить тот же namespace в messages/uk.json**

```json
  "Layout": {
    "openMenu": "Відкрити меню",
    "closeMenu": "Закрити меню",
    "toggleSubmenu": "Розгорнути підменю",
    "switchLanguage": "Змінити мову",
    "newsletterPlaceholder": "Ваш email",
    "newsletterSubmit": "Підписатися",
    "newsletterSending": "Надсилаємо...",
    "newsletterError": "Щось пішло не так. Спробуйте ще раз.",
    "newsletterSuccess": "Дякуємо за підписку!"
  },
```

- [ ] **Step 6: Проверить валидность JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/uk.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 7: Проверить, что наборы ключей en и uk совпадают**

Run:
```bash
node -e "
const en=Object.keys(JSON.parse(require('fs').readFileSync('messages/en.json','utf8')).Layout).sort();
const uk=Object.keys(JSON.parse(require('fs').readFileSync('messages/uk.json','utf8')).Layout).sort();
console.log(JSON.stringify(en)===JSON.stringify(uk) ? 'match' : 'MISMATCH');
"
```
Expected: `match`

- [ ] **Step 8: Застейджить**

```bash
git add src/app/\(frontend\)/_features/layout/api src/app/\(frontend\)/_features/layout/index.ts messages/en.json messages/uk.json
```

---

### Task 5: Навигация хедера с выпадающими подменю

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/HeaderLayout.tsx`
- Create: `src/app/(frontend)/_features/layout/ui/HeaderNav.tsx`
- Create: `src/app/(frontend)/_features/layout/ui/NavDropdown.tsx`
- Test: `tests/int/headerNav.int.spec.tsx`

**Interfaces:**
- Consumes: тип `Header` из `@/payload-types` (Задача 1), `CMSLink` из `@/components/Link`, `Show` из `@frontend/_shared/ui/Show`.
- Produces:
  - `type HeaderNavItem = NonNullable<Header['navItems']>[number]` — экспортируется из `HeaderNav.tsx`, используется в Задачах 7 и 8.
  - `HeaderNav: React.FC<{ items: HeaderNavItem[] }>`
  - `NavDropdown: React.FC<{ item: HeaderNavItem }>`
  - `HeaderLayout` со слотами `.Logo`, `.Nav`, `.Actions` (Object.assign).

- [ ] **Step 1: Написать падающий тест**

Файл `tests/int/headerNav.int.spec.tsx` (расширение `.tsx` — внутри JSX; паттерн include `tests/int/**/*.int.spec.ts` его НЕ подхватит, поэтому Step 2 включает правку конфига vitest):

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { HeaderNav, type HeaderNavItem } from '@frontend/_features/layout/ui/HeaderNav'

afterEach(cleanup)

const plainItem: HeaderNavItem = {
  id: '1',
  link: { label: 'Contact us', type: 'custom', url: '/contact-us' },
}

const itemWithSubmenu: HeaderNavItem = {
  id: '2',
  link: { label: 'Solution', type: 'custom', url: '/solution' },
  subItems: [
    { id: 's1', link: { label: 'DrugCard Platform', type: 'custom', url: '/local-literature' } },
    { id: 's2', link: { label: 'Simple Search', type: 'custom', url: '/simple-search' } },
  ],
}

describe('HeaderNav', () => {
  it('renders a plain item as a link without a submenu trigger', () => {
    render(<HeaderNav items={[plainItem]} />)

    expect(screen.getByRole('link', { name: 'Contact us' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /submenu/i })).toBeNull()
  })

  it('keeps the parent of a submenu clickable as a link', () => {
    render(<HeaderNav items={[itemWithSubmenu]} />)

    expect(screen.getByRole('link', { name: 'Solution' })).toBeTruthy()
  })

  it('hides submenu links until the item is opened', () => {
    render(<HeaderNav items={[itemWithSubmenu]} />)

    expect(screen.queryByRole('link', { name: 'Simple Search' })).toBeNull()
  })

  it('reveals submenu links after clicking the toggle', async () => {
    const user = userEvent.setup()
    render(<HeaderNav items={[itemWithSubmenu]} />)

    await user.click(screen.getByRole('button', { name: /submenu/i }))

    expect(screen.getByRole('link', { name: 'Simple Search' })).toBeTruthy()
  })

  it('renders nothing when there are no items', () => {
    const { container } = render(<HeaderNav items={[]} />)

    expect(container.querySelectorAll('a').length).toBe(0)
  })
})
```

- [ ] **Step 2: Убедиться, что .tsx-тесты уже разрешены (сделано в Задаче 3)**

Run: `grep -n "include" vitest.config.mts`
Expected: строка содержит `tests/int/**/*.int.spec.tsx`. Если нет — применить правку из Задачи 3, Step 2.

- [ ] **Step 3: Проверить, что установлен @testing-library/user-event**

Run: `grep -n "user-event" package.json`
Expected: строка с `"@testing-library/user-event"`.

Если пакета нет — установить как dev-зависимость: `pnpm add -D @testing-library/user-event` (это тестовый инструмент из той же экосистемы, что уже установленный `@testing-library/react`, — под запрет «новых библиотек» из Global Constraints не подпадает).

- [ ] **Step 4: Запустить тест — должен упасть**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/headerNav.int.spec.tsx`
Expected: FAIL — `Failed to resolve import "@frontend/_features/layout/ui/HeaderNav"`.

- [ ] **Step 5: Реализовать NavDropdown**

Файл `src/app/(frontend)/_features/layout/ui/NavDropdown.tsx`:

```tsx
'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'

import { CMSLink } from '@/components/Link'
import { Show } from '@frontend/_shared/ui/Show'

import type { HeaderNavItem } from './HeaderNav'

type SubItem = NonNullable<HeaderNavItem['subItems']>[number]

const CHEVRON_PATH = 'M4 6L8 10L12 6'

export const NavDropdown: React.FC<{ item: HeaderNavItem }> = ({ item }) => {
  const t = useTranslations('Layout')
  const [isOpen, setIsOpen] = useState(false)

  const openMenu = () => setIsOpen(true)
  const closeMenu = () => setIsOpen(false)
  const toggleMenu = () => setIsOpen(!isOpen)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') closeMenu()
  }

  const subItems = item.subItems || []

  const toSubLink = (subItem: SubItem, index: number) => (
    <li key={subItem.id || index}>
      <CMSLink
        {...subItem.link}
        className="block whitespace-nowrap px-4 py-2 text-sm text-foreground transition hover:bg-muted"
      />
    </li>
  )

  return (
    <div
      className="relative"
      onBlur={closeMenu}
      onFocus={openMenu}
      onKeyDown={handleKeyDown}
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
    >
      <span className="flex items-center gap-1">
        <CMSLink
          {...item.link}
          className="text-sm font-semibold text-foreground transition hover:text-primary"
        />
        <button
          aria-expanded={isOpen}
          aria-label={t('toggleSubmenu')}
          className="cursor-pointer p-1"
          onClick={toggleMenu}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 16 16"
          >
            <path d={CHEVRON_PATH} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </span>

      <Show when={isOpen}>
        <ul className="absolute left-0 top-full z-30 min-w-56 rounded-lg border border-border bg-background py-2 shadow-lg">
          {subItems.map(toSubLink)}
        </ul>
      </Show>
    </div>
  )
}
```

- [ ] **Step 6: Реализовать HeaderNav**

Файл `src/app/(frontend)/_features/layout/ui/HeaderNav.tsx`:

```tsx
'use client'

import React from 'react'

import { CMSLink } from '@/components/Link'
import type { Header } from '@/payload-types'

import { NavDropdown } from './NavDropdown'

export type HeaderNavItem = NonNullable<Header['navItems']>[number]

const hasSubItems = (item: HeaderNavItem) => !!item.subItems && item.subItems.length > 0

const NavEntry: React.FC<{ item: HeaderNavItem }> = ({ item }) => {
  if (hasSubItems(item)) return <NavDropdown item={item} />

  return (
    <CMSLink
      {...item.link}
      className="text-sm font-semibold text-foreground transition hover:text-primary"
    />
  )
}

export const HeaderNav: React.FC<{ items: HeaderNavItem[] }> = ({ items }) => {
  const toNavEntry = (item: HeaderNavItem, index: number) => (
    <NavEntry item={item} key={item.id || index} />
  )

  return <nav className="flex items-center gap-6">{items.map(toNavEntry)}</nav>
}
```

- [ ] **Step 7: Реализовать HeaderLayout (только позиционирование)**

Файл `src/app/(frontend)/_features/layout/ui/HeaderLayout.tsx`:

```tsx
import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => (
  <header className="sticky top-0 z-40 border-b border-border bg-background">
    <div className="container flex h-20 items-center justify-between gap-6">{children}</div>
  </header>
)

const Logo: React.FC<SlotProps> = ({ children }) => (
  <div className="flex shrink-0 items-center">{children}</div>
)

const Nav: React.FC<SlotProps> = ({ children }) => (
  <div className="hidden flex-1 justify-center lg:flex">{children}</div>
)

const Actions: React.FC<SlotProps> = ({ children }) => (
  <div className="flex shrink-0 items-center gap-3">{children}</div>
)

export const HeaderLayout = Object.assign(Root, { Actions, Logo, Nav })
```

- [ ] **Step 8: Запустить тест — должен пройти**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/headerNav.int.spec.tsx`
Expected: PASS, 5 тестов.

Если тесты падают на `useTranslations` (нет провайдера next-intl в тестовой среде) — обернуть рендер в тесте в `NextIntlClientProvider`:

```tsx
import { NextIntlClientProvider } from 'next-intl'

const renderNav = (items: HeaderNavItem[]) =>
  render(
    <NextIntlClientProvider locale="en" messages={{ Layout: { toggleSubmenu: 'Toggle submenu' } }}>
      <HeaderNav items={items} />
    </NextIntlClientProvider>,
  )
```

и заменить `render(<HeaderNav items={...} />)` на `renderNav([...])` во всех тестах файла.

- [ ] **Step 9: Линт**

Run: `pnpm lint`
Expected: без ошибок.

- [ ] **Step 10: Застейджить**

```bash
git add vitest.config.mts src/app/\(frontend\)/_features/layout/ui/HeaderLayout.tsx src/app/\(frontend\)/_features/layout/ui/HeaderNav.tsx src/app/\(frontend\)/_features/layout/ui/NavDropdown.tsx tests/int/headerNav.int.spec.tsx package.json
```

---

### Task 6: Кнопки хедера и переключатель языка

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/LoginButton.tsx`
- Create: `src/app/(frontend)/_features/layout/ui/RequestDemoButton.tsx`
- Create: `src/app/(frontend)/_features/layout/ui/LocaleSwitcher.tsx`
- Test: `tests/int/localeSwitcher.int.spec.tsx`

**Interfaces:**
- Consumes: `useContactModal` из `@frontend/_features/contact` (публичный API фичи), `Link`/`usePathname` из `@/i18n/navigation`, `routing` из `@/i18n/routing`.
- Produces:
  - `LoginButton: React.FC<{ link: NonNullable<Header['ctaButtons']>['loginButton'] }>`
  - `RequestDemoButton: React.FC<{ label: string; className?: string }>`
  - `LocaleSwitcher: React.FC` (без пропов — берёт локаль из next-intl)

- [ ] **Step 1: Написать падающий тест для LocaleSwitcher**

Файл `tests/int/localeSwitcher.int.spec.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, locale }: { children: React.ReactNode; href: string; locale: string }) => (
    <a data-locale={locale} href={`/${locale}${href}`}>
      {children}
    </a>
  ),
  usePathname: () => '/blog',
}))

import { LocaleSwitcher } from '@frontend/_features/layout/ui/LocaleSwitcher'

afterEach(cleanup)

const renderSwitcher = (locale: string) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ Layout: { switchLanguage: 'Switch language' } }}
    >
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  )

describe('LocaleSwitcher', () => {
  it('renders one link per configured locale', () => {
    renderSwitcher('en')

    expect(screen.getByText('EN')).toBeTruthy()
    expect(screen.getByText('UK')).toBeTruthy()
  })

  it('keeps the current pathname when switching locale', () => {
    renderSwitcher('en')

    const ukLink = screen.getByText('UK').closest('a') as HTMLAnchorElement

    expect(ukLink.getAttribute('href')).toBe('/uk/blog')
  })

  it('marks the active locale with aria-current', () => {
    renderSwitcher('uk')

    const ukLink = screen.getByText('UK').closest('a') as HTMLAnchorElement
    const enLink = screen.getByText('EN').closest('a') as HTMLAnchorElement

    expect(ukLink.getAttribute('aria-current')).toBe('true')
    expect(enLink.getAttribute('aria-current')).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/localeSwitcher.int.spec.tsx`
Expected: FAIL — модуль `LocaleSwitcher` не найден.

- [ ] **Step 3: Реализовать LocaleSwitcher**

Файл `src/app/(frontend)/_features/layout/ui/LocaleSwitcher.tsx`:

```tsx
'use client'

import { useLocale, useTranslations } from 'next-intl'
import React from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { cn } from '@/utilities/ui'

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'EN',
  uk: 'UK',
}

export const LocaleSwitcher: React.FC = () => {
  const t = useTranslations('Layout')
  const activeLocale = useLocale()
  // usePathname из next-intl отдаёт путь БЕЗ префикса локали,
  // поэтому Link с пропом locale переключает язык, сохраняя страницу.
  const pathname = usePathname()

  const toLocaleLink = (locale: AppLocale) => {
    const isActive = locale === activeLocale

    return (
      <Link
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'px-1 text-sm font-semibold transition',
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
        href={pathname}
        key={locale}
        locale={locale}
      >
        {LOCALE_LABELS[locale]}
      </Link>
    )
  }

  return (
    <div aria-label={t('switchLanguage')} className="flex items-center gap-1">
      {routing.locales.map(toLocaleLink)}
    </div>
  )
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/localeSwitcher.int.spec.tsx`
Expected: PASS, 3 теста.

- [ ] **Step 5: Реализовать LoginButton**

Файл `src/app/(frontend)/_features/layout/ui/LoginButton.tsx`:

```tsx
import React from 'react'

import { CMSLink } from '@/components/Link'
import type { Header } from '@/payload-types'

type LoginLink = NonNullable<Header['ctaButtons']>['loginButton']

export const LoginButton: React.FC<{ link: LoginLink }> = ({ link }) => (
  <CMSLink
    {...link}
    className="hidden rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary md:inline-flex"
  />
)
```

- [ ] **Step 6: Реализовать RequestDemoButton**

Файл `src/app/(frontend)/_features/layout/ui/RequestDemoButton.tsx`:

```tsx
'use client'

import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'
import { cn } from '@/utilities/ui'

type RequestDemoButtonProps = {
  className?: string
  label: string
}

export const RequestDemoButton: React.FC<RequestDemoButtonProps> = ({ className, label }) => (
  <ContactModalTrigger
    className={cn(
      'cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90',
      className,
    )}
  >
    {label}
  </ContactModalTrigger>
)
```

- [ ] **Step 7: Проверить, что ContactModalTrigger экспортируется из корня фичи contact**

Run: `grep -n "ContactModalTrigger" src/app/\(frontend\)/_features/contact/index.ts`
Expected: строка с экспортом (она там есть). Если нет — добавить экспорт в `index.ts` фичи contact, но НЕ импортировать из её внутренностей.

- [ ] **Step 8: Линт**

Run: `pnpm lint`
Expected: без ошибок.

- [ ] **Step 9: Застейджить**

```bash
git add src/app/\(frontend\)/_features/layout/ui/LoginButton.tsx src/app/\(frontend\)/_features/layout/ui/RequestDemoButton.tsx src/app/\(frontend\)/_features/layout/ui/LocaleSwitcher.tsx tests/int/localeSwitcher.int.spec.tsx
```

---

### Task 7: Мобильное меню

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/MobileMenu.tsx`
- Test: `tests/int/mobileMenu.int.spec.tsx`

**Interfaces:**
- Consumes: `HeaderNavItem` из `./HeaderNav` (Задача 5), `LocaleSwitcher` и `RequestDemoButton` из Задачи 6.
- Produces: `MobileMenu: React.FC<{ demoLabel: string | null; items: HeaderNavItem[]; loginLink: LoginLink }>`

- [ ] **Step 1: Написать падающий тест**

Файл `tests/int/mobileMenu.int.spec.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, locale }: { children: React.ReactNode; href: string; locale: string }) => (
    <a href={`/${locale}${href}`}>{children}</a>
  ),
  usePathname: () => '/',
}))

vi.mock('@frontend/_features/contact', () => ({
  ContactModalTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}))

import { MobileMenu } from '@frontend/_features/layout/ui/MobileMenu'
import type { HeaderNavItem } from '@frontend/_features/layout/ui/HeaderNav'

afterEach(cleanup)

const items: HeaderNavItem[] = [
  {
    id: '1',
    link: { label: 'Solution', type: 'custom', url: '/solution' },
    subItems: [
      { id: 's1', link: { label: 'Simple Search', type: 'custom', url: '/simple-search' } },
    ],
  },
  { id: '2', link: { label: 'Blog', type: 'custom', url: '/blog' } },
]

const MESSAGES = {
  Layout: {
    closeMenu: 'Close menu',
    openMenu: 'Open menu',
    switchLanguage: 'Switch language',
    toggleSubmenu: 'Toggle submenu',
  },
}

const renderMenu = () =>
  render(
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <MobileMenu
        demoLabel="Request a Demo"
        items={items}
        loginLink={{ label: 'Log In', type: 'custom', url: 'https://app.drug-card.io/login/en' }}
      />
    </NextIntlClientProvider>,
  )

describe('MobileMenu', () => {
  it('keeps the panel closed initially', () => {
    renderMenu()

    expect(screen.queryByRole('link', { name: 'Blog' })).toBeNull()
  })

  it('opens the panel with every nav item and sub item', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByRole('link', { name: 'Blog' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Simple Search' })).toBeTruthy()
  })

  it('closes the panel again from the close button', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('button', { name: 'Close menu' }))

    expect(screen.queryByRole('link', { name: 'Blog' })).toBeNull()
  })

  it('shows the demo button inside the open panel', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByRole('button', { name: 'Request a Demo' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/mobileMenu.int.spec.tsx`
Expected: FAIL — модуль `MobileMenu` не найден.

- [ ] **Step 3: Реализовать MobileMenu**

Файл `src/app/(frontend)/_features/layout/ui/MobileMenu.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import React, { useState } from 'react'

import { CMSLink } from '@/components/Link'
import type { Header } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import type { HeaderNavItem } from './HeaderNav'
import { LocaleSwitcher } from './LocaleSwitcher'
import { RequestDemoButton } from './RequestDemoButton'

type LoginLink = NonNullable<Header['ctaButtons']>['loginButton']
type SubItem = NonNullable<HeaderNavItem['subItems']>[number]

const BURGER_PATH = 'M3 6h18M3 12h18M3 18h18'
const CLOSE_PATH = 'M6 6l12 12M18 6L6 18'

const MenuIcon: React.FC<{ path: string }> = ({ path }) => (
  <svg
    aria-hidden="true"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d={path} strokeLinecap="round" />
  </svg>
)

const MobileNavItem: React.FC<{ item: HeaderNavItem }> = ({ item }) => {
  const subItems = item.subItems || []

  const toSubLink = (subItem: SubItem, index: number) => (
    <li key={subItem.id || index}>
      <CMSLink {...subItem.link} className="block py-2 text-sm text-muted-foreground" />
    </li>
  )

  return (
    <li className="border-b border-border py-3">
      <CMSLink {...item.link} className="block font-semibold text-foreground" />
      <Show when={subItems.length > 0}>
        <ul className="mt-1 pl-4">{subItems.map(toSubLink)}</ul>
      </Show>
    </li>
  )
}

type MobileMenuProps = {
  demoLabel: string | null
  items: HeaderNavItem[]
  loginLink: LoginLink
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ demoLabel, items, loginLink }) => {
  const t = useTranslations('Layout')
  const [isOpen, setIsOpen] = useState(false)

  const openMenu = () => setIsOpen(true)
  const closeMenu = () => setIsOpen(false)

  const toNavItem = (item: HeaderNavItem, index: number) => (
    <MobileNavItem item={item} key={item.id || index} />
  )

  return (
    <div className="lg:hidden">
      <Show when={!isOpen}>
        <button
          aria-label={t('openMenu')}
          className="cursor-pointer p-2"
          onClick={openMenu}
          type="button"
        >
          <MenuIcon path={BURGER_PATH} />
        </button>
      </Show>

      <Show when={isOpen}>
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="container flex h-20 items-center justify-end">
            <button
              aria-label={t('closeMenu')}
              className="cursor-pointer p-2"
              onClick={closeMenu}
              type="button"
            >
              <MenuIcon path={CLOSE_PATH} />
            </button>
          </div>

          <div className="container flex-1 overflow-y-auto pb-10">
            <ul>{items.map(toNavItem)}</ul>

            <div className="mt-6 flex flex-col gap-4">
              <CMSLink
                {...loginLink}
                className="rounded-full border border-border px-5 py-2 text-center text-sm font-semibold"
              />
              <Show when={!!demoLabel}>
                <RequestDemoButton className="w-full" label={demoLabel as string} />
              </Show>
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/mobileMenu.int.spec.tsx`
Expected: PASS, 4 теста.

- [ ] **Step 5: Линт**

Run: `pnpm lint`
Expected: без ошибок.

- [ ] **Step 6: Застейджить**

```bash
git add src/app/\(frontend\)/_features/layout/ui/MobileMenu.tsx tests/int/mobileMenu.int.spec.tsx
```

---

### Task 8: Сборка SiteHeader и подключение вместо старого хедера

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/SiteHeader.tsx`
- Modify: `src/app/(frontend)/_features/layout/index.ts`
- Modify: `src/app/(frontend)/[locale]/layout.tsx:16` (импорт) и `:71` (рендер)
- Delete: `src/globals/Header/Component.tsx`, `src/globals/Header/Component.client.tsx`, `src/globals/Header/Nav/index.tsx`

**Interfaces:**
- Consumes: `fetchHeaderData` (Задача 4), `SiteLogo` (Задача 3), `HeaderLayout`/`HeaderNav` (Задача 5), `LoginButton`/`RequestDemoButton`/`LocaleSwitcher` (Задача 6), `MobileMenu` (Задача 7).
- Produces: `SiteHeader: React.FC<{ locale: TypedLocale }>` — экспортируется из `index.ts` фичи; это единственная точка входа хедера для роутов.

- [ ] **Step 1: Реализовать SiteHeader (серверный компонент)**

Файл `src/app/(frontend)/_features/layout/ui/SiteHeader.tsx`:

```tsx
import Link from 'next/link'
import type { TypedLocale } from 'payload'
import React from 'react'

import { Show } from '@frontend/_shared/ui/Show'

import { fetchHeaderData } from '../api/header'
import { HeaderLayout } from './HeaderLayout'
import { HeaderNav } from './HeaderNav'
import { LocaleSwitcher } from './LocaleSwitcher'
import { LoginButton } from './LoginButton'
import { MobileMenu } from './MobileMenu'
import { RequestDemoButton } from './RequestDemoButton'
import { SiteLogo } from './SiteLogo'

export const SiteHeader = async ({ locale }: { locale: TypedLocale }) => {
  const header = await fetchHeaderData(locale)

  const navItems = header?.navItems || []
  const ctaButtons = header?.ctaButtons
  const loginLink = ctaButtons ? ctaButtons.loginButton : null
  const demoLabel = ctaButtons ? ctaButtons.demoButtonLabel : null

  return (
    <HeaderLayout>
      <HeaderLayout.Logo>
        <Link href={`/${locale}`}>
          <SiteLogo priority />
        </Link>
      </HeaderLayout.Logo>

      <HeaderLayout.Nav>
        <HeaderNav items={navItems} />
      </HeaderLayout.Nav>

      <HeaderLayout.Actions>
        <LocaleSwitcher />

        <Show when={!!loginLink}>
          <LoginButton link={loginLink} />
        </Show>

        <Show when={!!demoLabel}>
          <RequestDemoButton className="hidden md:inline-flex" label={demoLabel as string} />
        </Show>

        <MobileMenu demoLabel={demoLabel} items={navItems} loginLink={loginLink} />
      </HeaderLayout.Actions>
    </HeaderLayout>
  )
}
```

- [ ] **Step 2: Открыть SiteHeader в публичном API фичи**

Файл `src/app/(frontend)/_features/layout/index.ts` целиком:

```ts
export { SiteHeader } from './ui/SiteHeader'
```

- [ ] **Step 3: Подключить в layout роутов**

В `src/app/(frontend)/[locale]/layout.tsx` удалить строку импорта старого хедера:

```tsx
import { Header } from '@/globals/Header/Component'
```

и добавить рядом с другими `@frontend`-импортами:

```tsx
import { SiteHeader } from '@frontend/_features/layout'
```

Заменить рендер:

```tsx
              <Header locale={locale} />
```

на:

```tsx
              <SiteHeader locale={locale} />
```

- [ ] **Step 4: Удалить старые компоненты хедера**

```bash
rm src/globals/Header/Component.tsx src/globals/Header/Component.client.tsx
rm -r src/globals/Header/Nav
```

`config.ts`, `RowLabel.tsx` и `hooks/` НЕ трогать — это бэкенд и админка.

- [ ] **Step 5: Убедиться, что на удалённые файлы никто не ссылается**

Run: `grep -rn "globals/Header/Component\|globals/Header/Nav" src/ tests/`
Expected: пустой вывод.

- [ ] **Step 6: Проверить типы и линт**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: обе команды без ошибок.

- [ ] **Step 7: Прогнать все юнит-тесты**

Run: `pnpm test:int`
Expected: PASS, включая тесты Задач 3, 5, 6, 7.

- [ ] **Step 8: Проверить в браузере**

Run: `pnpm dev`, открыть `http://localhost:3000/en`.
Expected: страница рендерится, шапка на месте (пока пустая — глобал не заполнен, это ожидаемо до Задачи 13), ошибок гидрации в консоли нет. Остановить сервер.

- [ ] **Step 9: Застейджить**

```bash
git add -A src/app/\(frontend\)/_features/layout src/app/\(frontend\)/\[locale\]/layout.tsx src/globals/Header
```

---

### Task 9: Контакты и колонки ссылок футера

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/FooterLayout.tsx`
- Create: `src/app/(frontend)/_features/layout/ui/FooterContacts.tsx`
- Create: `src/app/(frontend)/_features/layout/ui/FooterLinkColumns.tsx`
- Test: `tests/int/footerLinkColumns.int.spec.tsx`

**Interfaces:**
- Consumes: тип `Footer` из `@/payload-types` (Задача 2), `SiteLogo` (Задача 3).
- Produces:
  - `type FooterLinkColumn = NonNullable<Footer['linkColumns']>[number]` — экспорт из `FooterLinkColumns.tsx`
  - `FooterContacts: React.FC<{ contacts: Footer['contacts'] }>`
  - `FooterLinkColumns: React.FC<{ columns: FooterLinkColumn[] }>`
  - `FooterLayout` со слотами `.Top` (двухколоночная сетка «контакты + ссылки»), `.Contacts`, `.Columns`, `.Newsletter`, `.Socials`, `.Legal`

- [ ] **Step 1: Написать падающий тест**

Файл `tests/int/footerLinkColumns.int.spec.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  FooterLinkColumns,
  type FooterLinkColumn,
} from '@frontend/_features/layout/ui/FooterLinkColumns'

afterEach(cleanup)

const columns: FooterLinkColumn[] = [
  {
    id: 'c1',
    links: [
      { id: 'l1', link: { label: 'Why DrugCard?', type: 'custom', url: '/why-drugcard' } },
      { id: 'l2', link: { label: 'Simple Search', type: 'custom', url: '/simple-search' } },
    ],
    title: 'Product',
  },
  {
    id: 'c2',
    links: [{ id: 'l3', link: { label: 'Blog', type: 'custom', url: '/blog' } }],
    title: 'Resources',
  },
]

describe('FooterLinkColumns', () => {
  it('renders a heading per column', () => {
    render(<FooterLinkColumns columns={columns} />)

    expect(screen.getByText('Product')).toBeTruthy()
    expect(screen.getByText('Resources')).toBeTruthy()
  })

  it('renders every link of every column', () => {
    render(<FooterLinkColumns columns={columns} />)

    expect(screen.getByRole('link', { name: 'Why DrugCard?' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Simple Search' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Blog' })).toBeTruthy()
  })

  it('renders a column with no links without crashing', () => {
    render(<FooterLinkColumns columns={[{ id: 'c3', title: 'Empty' }]} />)

    expect(screen.getByText('Empty')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/footerLinkColumns.int.spec.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать FooterLinkColumns**

Файл `src/app/(frontend)/_features/layout/ui/FooterLinkColumns.tsx`:

```tsx
import React from 'react'

import { CMSLink } from '@/components/Link'
import type { Footer } from '@/payload-types'

export type FooterLinkColumn = NonNullable<Footer['linkColumns']>[number]
type ColumnLink = NonNullable<FooterLinkColumn['links']>[number]

const FooterColumn: React.FC<{ column: FooterLinkColumn }> = ({ column }) => {
  const links = column.links || []

  const toLink = (item: ColumnLink, index: number) => (
    <li key={item.id || index}>
      <CMSLink {...item.link} className="text-sm text-white/70 transition hover:text-white" />
    </li>
  )

  return (
    <div>
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
        {column.title}
      </p>
      <ul className="space-y-2">{links.map(toLink)}</ul>
    </div>
  )
}

export const FooterLinkColumns: React.FC<{ columns: FooterLinkColumn[] }> = ({ columns }) => {
  const toColumn = (column: FooterLinkColumn, index: number) => (
    <FooterColumn column={column} key={column.id || index} />
  )

  return <div className="grid grid-cols-2 gap-8 md:grid-cols-3">{columns.map(toColumn)}</div>
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/footerLinkColumns.int.spec.tsx`
Expected: PASS, 3 теста.

- [ ] **Step 5: Реализовать FooterContacts**

Файл `src/app/(frontend)/_features/layout/ui/FooterContacts.tsx`:

```tsx
import React from 'react'

import type { Footer } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import { SiteLogo } from './SiteLogo'

type Contacts = Footer['contacts']

export const FooterContacts: React.FC<{ contacts: Contacts }> = ({ contacts }) => {
  const address = contacts ? contacts.address : null
  const phone = contacts ? contacts.phone : null
  const email = contacts ? contacts.email : null
  const tagline = contacts ? contacts.tagline : null

  return (
    <div className="space-y-4">
      <SiteLogo variant="white" />

      <Show when={!!address}>
        <p className="max-w-xs whitespace-pre-line text-sm text-white/70">{address}</p>
      </Show>

      <Show when={!!phone}>
        <a className="block text-sm text-white/70 transition hover:text-white" href={`tel:${phone}`}>
          {phone}
        </a>
      </Show>

      <Show when={!!email}>
        <a
          className="block text-sm text-white/70 transition hover:text-white"
          href={`mailto:${email}`}
        >
          {email}
        </a>
      </Show>

      <Show when={!!tagline}>
        <p className="max-w-xs text-sm font-semibold text-white">{tagline}</p>
      </Show>
    </div>
  )
}
```

- [ ] **Step 6: Реализовать FooterLayout (только позиционирование)**

Файл `src/app/(frontend)/_features/layout/ui/FooterLayout.tsx`:

```tsx
import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => (
  <footer className="mt-auto bg-black text-white">
    <div className="container py-14">{children}</div>
  </footer>
)

const Top: React.FC<SlotProps> = ({ children }) => (
  <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">{children}</div>
)

const Contacts: React.FC<SlotProps> = ({ children }) => <div>{children}</div>

const Columns: React.FC<SlotProps> = ({ children }) => <div>{children}</div>

const Newsletter: React.FC<SlotProps> = ({ children }) => (
  <div className="mt-12 border-t border-white/10 pt-8">{children}</div>
)

const Socials: React.FC<SlotProps> = ({ children }) => <div className="mt-8">{children}</div>

const Legal: React.FC<SlotProps> = ({ children }) => (
  <div className="mt-8 border-t border-white/10 pt-6">{children}</div>
)

export const FooterLayout = Object.assign(Root, {
  Columns,
  Contacts,
  Legal,
  Newsletter,
  Socials,
  Top,
})
```

- [ ] **Step 7: Линт**

Run: `pnpm lint`
Expected: без ошибок.

- [ ] **Step 8: Застейджить**

```bash
git add src/app/\(frontend\)/_features/layout/ui/FooterLayout.tsx src/app/\(frontend\)/_features/layout/ui/FooterContacts.tsx src/app/\(frontend\)/_features/layout/ui/FooterLinkColumns.tsx tests/int/footerLinkColumns.int.spec.tsx
```

---

### Task 10: Иконки соцсетей

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/FooterSocials.tsx`
- Test: `tests/int/footerSocials.int.spec.tsx`

**Interfaces:**
- Consumes: тип `Footer` (Задача 2).
- Produces: `FooterSocials: React.FC<{ socials: NonNullable<Footer['socials']> }>` — рендерит ссылку-иконку на каждую соцсеть; неизвестная платформа пропускается.

- [ ] **Step 1: Написать падающий тест**

Файл `tests/int/footerSocials.int.spec.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { FooterSocials } from '@frontend/_features/layout/ui/FooterSocials'

afterEach(cleanup)

describe('FooterSocials', () => {
  it('renders one external link per social entry', () => {
    render(
      <FooterSocials
        socials={[
          { id: '1', platform: 'linkedin', url: 'https://linkedin.com/company/drugcard' },
          { id: '2', platform: 'youtube', url: 'https://youtube.com/@drugcard' },
        ]}
      />,
    )

    const linkedin = screen.getByRole('link', { name: 'LinkedIn' })

    expect(linkedin.getAttribute('href')).toBe('https://linkedin.com/company/drugcard')
    expect(linkedin.getAttribute('target')).toBe('_blank')
    expect(linkedin.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByRole('link', { name: 'YouTube' })).toBeTruthy()
  })

  it('skips an entry whose platform has no icon', () => {
    render(
      <FooterSocials
        socials={[
          { id: '1', platform: 'tiktok' as 'linkedin', url: 'https://tiktok.com/@drugcard' },
          { id: '2', platform: 'facebook', url: 'https://facebook.com/drugcard' },
        ]}
      />,
    )

    expect(screen.getAllByRole('link').length).toBe(1)
    expect(screen.getByRole('link', { name: 'Facebook' })).toBeTruthy()
  })

  it('skips an entry with no url', () => {
    render(<FooterSocials socials={[{ id: '1', platform: 'telegram', url: '' }]} />)

    expect(screen.queryAllByRole('link').length).toBe(0)
  })
})
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/footerSocials.int.spec.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать FooterSocials**

Файл `src/app/(frontend)/_features/layout/ui/FooterSocials.tsx`. Иконки — простые инлайн-SVG (один `path` на платформу), без внешних библиотек:

```tsx
import React from 'react'

import type { Footer } from '@/payload-types'

type SocialEntry = NonNullable<Footer['socials']>[number]
type Platform = SocialEntry['platform']

// Конфиг вместо switch: платформа → подпись и контур иконки.
const PLATFORMS: Partial<Record<Platform, { label: string; path: string }>> = {
  facebook: {
    label: 'Facebook',
    path: 'M13 22v-9h3l.5-4H13V6.5c0-1.1.3-1.8 1.9-1.8H17V1.1C16.6 1.1 15.4 1 14 1c-2.9 0-4.9 1.8-4.9 5.1V9H6v4h3.1v9H13z',
  },
  instagram: {
    label: 'Instagram',
    path: 'M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.9c-.1 3.2-1.6 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-3.3-.2-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.9s0-3.5.1-4.8C2.3 4 3.8 2.4 7.1 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 6.6a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm5-1.7a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z',
  },
  linkedin: {
    label: 'LinkedIn',
    path: 'M4.98 3.5a2.5 2.5 0 11-.01 5 2.5 2.5 0 01.01-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21.5 8.65 22 11 22 14.1V21h-4v-6.1c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V21h-4V9z',
  },
  telegram: {
    label: 'Telegram',
    path: 'M21.9 4.3L18.6 20c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13.6l-4.9-1.5c-1-.3-1.1-1 .2-1.5L20.5 3c.9-.3 1.7.2 1.4 1.3z',
  },
  x: {
    label: 'X',
    path: 'M18.2 2h3.3l-7.2 8.3L23 22h-6.7l-5.2-6.9L5.1 22H1.8l7.7-8.9L1.3 2H8l4.7 6.3L18.2 2zm-1.2 18h1.8L7.1 3.8H5.2L17 20z',
  },
  youtube: {
    label: 'YouTube',
    path: 'M23 12s0-3.6-.5-5.3a2.8 2.8 0 00-1.9-2C18.8 4.2 12 4.2 12 4.2s-6.8 0-8.6.5a2.8 2.8 0 00-1.9 2C1 8.4 1 12 1 12s0 3.6.5 5.3c.3 1 1 1.7 1.9 2 1.8.5 8.6.5 8.6.5s6.8 0 8.6-.5a2.8 2.8 0 001.9-2c.5-1.7.5-5.3.5-5.3zM9.8 15.4V8.6l5.7 3.4-5.7 3.4z',
  },
}

const isRenderable = (entry: SocialEntry) => !!entry.url && !!PLATFORMS[entry.platform]

export const FooterSocials: React.FC<{ socials: NonNullable<Footer['socials']> }> = ({
  socials,
}) => {
  const toSocialLink = (entry: SocialEntry, index: number) => {
    const platform = PLATFORMS[entry.platform] as { label: string; path: string }

    return (
      <a
        aria-label={platform.label}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        href={entry.url}
        key={entry.id || index}
        rel="noopener noreferrer"
        target="_blank"
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d={platform.path} />
        </svg>
      </a>
    )
  }

  return <div className="flex gap-3">{socials.filter(isRenderable).map(toSocialLink)}</div>
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/footerSocials.int.spec.tsx`
Expected: PASS, 3 теста.

- [ ] **Step 5: Линт**

Run: `pnpm lint`
Expected: без ошибок.

- [ ] **Step 6: Застейджить**

```bash
git add src/app/\(frontend\)/_features/layout/ui/FooterSocials.tsx tests/int/footerSocials.int.spec.tsx
```

---

### Task 11: Блок подписки на рассылку

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/NewsletterSignup.tsx`
- Test: `tests/int/newsletterSignup.int.spec.tsx`

**Interfaces:**
- Consumes: тип `Form` из `@/payload-types`, эндпоинт `POST /api/form-submissions` (тот же, что у `FormRenderer`).
- Produces:
  - `findEmailFieldName(form: Form): string | null` — чистая функция, экспортируется для тестов
  - `NewsletterSignup: React.FC<{ form: Form; heading?: string | null }>`

- [ ] **Step 1: Написать падающий тест**

Файл `tests/int/newsletterSignup.int.spec.tsx`:

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  findEmailFieldName,
  NewsletterSignup,
} from '@frontend/_features/layout/ui/NewsletterSignup'
import type { Form } from '@/payload-types'

afterEach(cleanup)

const form = {
  fields: [
    { blockType: 'text', id: 'f0', name: 'firstName', required: false },
    { blockType: 'email', id: 'f1', name: 'email', required: true },
  ],
  id: 'form-1',
  submitButtonLabel: 'Subscribe',
  title: 'Newsletter',
} as unknown as Form

const MESSAGES = {
  Layout: {
    newsletterError: 'Something went wrong. Please try again.',
    newsletterPlaceholder: 'Your email',
    newsletterSending: 'Sending...',
    newsletterSubmit: 'Subscribe',
    newsletterSuccess: 'Thank you for subscribing!',
  },
}

const renderSignup = () =>
  render(
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <NewsletterSignup form={form} heading="Sign up and receive the latest tips via email" />
    </NextIntlClientProvider>,
  )

describe('findEmailFieldName', () => {
  it('returns the name of the first email field', () => {
    expect(findEmailFieldName(form)).toBe('email')
  })

  it('returns null when the form has no email field', () => {
    const withoutEmail = { fields: [{ blockType: 'text', id: 'x', name: 'note' }] } as unknown as Form

    expect(findEmailFieldName(withoutEmail)).toBeNull()
  })
})

describe('NewsletterSignup', () => {
  it('renders the heading and the submit label from the form', () => {
    renderSignup()

    expect(screen.getByText('Sign up and receive the latest tips via email')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeTruthy()
  })

  it('posts the email to the form-submissions endpoint and shows success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByPlaceholderText('Your email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('/api/form-submissions')
    expect(JSON.parse(options.body)).toEqual({
      form: 'form-1',
      submissionData: [{ field: 'email', value: 'a@b.com' }],
    })

    await waitFor(() => expect(screen.getByText('Thank you for subscribing!')).toBeTruthy())

    vi.unstubAllGlobals()
  })

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByPlaceholderText('Your email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))

    await waitFor(() =>
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy(),
    )

    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/newsletterSignup.int.spec.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать NewsletterSignup**

Файл `src/app/(frontend)/_features/layout/ui/NewsletterSignup.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import React, { useState } from 'react'

import type { Form } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

type FormFieldBlock = NonNullable<Form['fields']>[number]
type SubmissionState = 'idle' | 'sending' | 'success' | 'error'

const isEmailField = (field: FormFieldBlock) => field.blockType === 'email'

// Имя email-поля задаёт редактор в админке, поэтому берём его из формы,
// а не хардкодим — иначе сабмит уйдёт в несуществующее поле.
export const findEmailFieldName = (form: Form) => {
  const fields = form.fields || []
  const emailField = fields.find(isEmailField)

  if (!emailField) return null

  return emailField.name
}

type NewsletterSignupProps = {
  form: Form
  heading?: string | null
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({ form, heading }) => {
  const t = useTranslations('Layout')
  const [state, setState] = useState<SubmissionState>('idle')

  const emailFieldName = findEmailFieldName(form)

  const submitEmail = async (email: string) => {
    setState('sending')

    try {
      const response = await fetch('/api/form-submissions', {
        body: JSON.stringify({
          form: form.id,
          submissionData: [{ field: emailFieldName, value: email }],
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      setState(response.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    void submitEmail(String(formData.get('email') || ''))
  }

  const submitLabel = form.submitButtonLabel || t('newsletterSubmit')
  const buttonLabel = state === 'sending' ? t('newsletterSending') : submitLabel

  // Форма без email-поля не может быть отправлена — блок не рендерим.
  if (!emailFieldName) return null

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <Show when={!!heading}>
        <p className="max-w-sm text-sm font-semibold text-white">{heading}</p>
      </Show>

      <Show when={state === 'success'}>
        <p className="text-sm text-white">{t('newsletterSuccess')}</p>
      </Show>

      <Show when={state !== 'success'}>
        <form className="flex w-full max-w-md flex-col gap-2" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              className="h-10 w-full rounded-full border border-white/20 bg-transparent px-4 text-sm text-white placeholder:text-white/50"
              name="email"
              placeholder={t('newsletterPlaceholder')}
              required
              type="email"
            />
            <button
              className="cursor-pointer whitespace-nowrap rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-default disabled:opacity-60"
              disabled={state === 'sending'}
              type="submit"
            >
              {buttonLabel}
            </button>
          </div>

          <Show when={state === 'error'}>
            <p className="text-sm text-red-400">{t('newsletterError')}</p>
          </Show>
        </form>
      </Show>
    </div>
  )
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/newsletterSignup.int.spec.tsx`
Expected: PASS, 5 тестов (2 для `findEmailFieldName`, 3 для компонента).

- [ ] **Step 5: Линт**

Run: `pnpm lint`
Expected: без ошибок.

- [ ] **Step 6: Застейджить**

```bash
git add src/app/\(frontend\)/_features/layout/ui/NewsletterSignup.tsx tests/int/newsletterSignup.int.spec.tsx
```

---

### Task 12: Сборка SiteFooter и подключение вместо старого футера

**Files:**
- Create: `src/app/(frontend)/_features/layout/ui/FooterLegal.tsx`
- Create: `src/app/(frontend)/_features/layout/ui/SiteFooter.tsx`
- Modify: `src/app/(frontend)/_features/layout/index.ts`
- Modify: `src/app/(frontend)/[locale]/layout.tsx:15` (импорт) и `:73` (рендер)
- Delete: `src/globals/Footer/Component.tsx`

**Interfaces:**
- Consumes: `fetchFooterData` (Задача 4), `FooterLayout`/`FooterContacts`/`FooterLinkColumns` (Задача 9), `FooterSocials` (Задача 10), `NewsletterSignup` (Задача 11).
- Produces: `SiteFooter: React.FC<{ locale: TypedLocale }>` — экспортируется из `index.ts` фичи.

- [ ] **Step 1: Реализовать FooterLegal**

Файл `src/app/(frontend)/_features/layout/ui/FooterLegal.tsx`:

```tsx
import React from 'react'

import { CMSLink } from '@/components/Link'
import type { Footer } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

type Legal = Footer['legal']
type LegalLink = NonNullable<NonNullable<Legal>['legalLinks']>[number]

export const FooterLegal: React.FC<{ legal: Legal }> = ({ legal }) => {
  const copyright = legal ? legal.copyright : null
  const legalLinks = legal && legal.legalLinks ? legal.legalLinks : []

  const toLegalLink = (item: LegalLink, index: number) => (
    <CMSLink
      {...item.link}
      className="text-xs text-white/60 transition hover:text-white"
      key={item.id || index}
    />
  )

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <Show when={!!copyright}>
        <p className="text-xs text-white/60">{copyright}</p>
      </Show>

      <Show when={legalLinks.length > 0}>
        <div className="flex flex-wrap gap-4">{legalLinks.map(toLegalLink)}</div>
      </Show>
    </div>
  )
}
```

- [ ] **Step 2: Реализовать SiteFooter (серверный компонент)**

Файл `src/app/(frontend)/_features/layout/ui/SiteFooter.tsx`:

```tsx
import type { TypedLocale } from 'payload'
import React from 'react'

import type { Form } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import { fetchFooterData } from '../api/footer'
import { FooterContacts } from './FooterContacts'
import { FooterLayout } from './FooterLayout'
import { FooterLegal } from './FooterLegal'
import { FooterLinkColumns } from './FooterLinkColumns'
import { FooterSocials } from './FooterSocials'
import { NewsletterSignup } from './NewsletterSignup'

// depth 1 отдаёт связанную форму объектом; строка означает, что документ
// не разрешился (форма удалена) — блок подписки тогда не рендерим.
const resolveNewsletterForm = (form: unknown) => {
  if (!form || typeof form !== 'object') return null

  return form as Form
}

export const SiteFooter = async ({ locale }: { locale: TypedLocale }) => {
  const footer = await fetchFooterData(locale)

  const linkColumns = footer?.linkColumns || []
  const socials = footer?.socials || []
  const newsletter = footer?.newsletter
  const newsletterForm = resolveNewsletterForm(newsletter ? newsletter.form : null)

  return (
    <FooterLayout>
      <FooterLayout.Top>
        <FooterLayout.Contacts>
          <FooterContacts contacts={footer?.contacts} />
        </FooterLayout.Contacts>

        <FooterLayout.Columns>
          <Show when={linkColumns.length > 0}>
            <FooterLinkColumns columns={linkColumns} />
          </Show>
        </FooterLayout.Columns>
      </FooterLayout.Top>

      <Show when={!!newsletterForm}>
        <FooterLayout.Newsletter>
          <NewsletterSignup
            form={newsletterForm as Form}
            heading={newsletter ? newsletter.heading : null}
          />
        </FooterLayout.Newsletter>
      </Show>

      <Show when={socials.length > 0}>
        <FooterLayout.Socials>
          <FooterSocials socials={socials} />
        </FooterLayout.Socials>
      </Show>

      <FooterLayout.Legal>
        <FooterLegal legal={footer?.legal} />
      </FooterLayout.Legal>
    </FooterLayout>
  )
}
```

- [ ] **Step 3: Дополнить публичный API фичи**

Файл `src/app/(frontend)/_features/layout/index.ts` целиком:

```ts
export { SiteFooter } from './ui/SiteFooter'
export { SiteHeader } from './ui/SiteHeader'
```

- [ ] **Step 4: Подключить в layout роутов**

В `src/app/(frontend)/[locale]/layout.tsx` удалить импорт старого футера:

```tsx
import { Footer } from '@/globals/Footer/Component'
```

Обновить импорт фичи, добавив `SiteFooter`:

```tsx
import { SiteFooter, SiteHeader } from '@frontend/_features/layout'
```

Заменить рендер:

```tsx
              <Footer locale={locale} />
```

на:

```tsx
              <SiteFooter locale={locale} />
```

- [ ] **Step 5: Удалить старый компонент футера**

```bash
rm src/globals/Footer/Component.tsx
```

`config.ts`, `RowLabel.tsx`, `hooks/` остаются. `src/providers/Theme/ThemeSelector` НЕ удалять — переключатель темы просто больше не рендерится в футере (сами провайдеры темы остаются нетронутыми, как решено в спеке).

- [ ] **Step 6: Убедиться, что на удалённый файл никто не ссылается**

Run: `grep -rn "globals/Footer/Component" src/ tests/`
Expected: пустой вывод.

- [ ] **Step 7: Проверить типы и линт**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: без ошибок.

- [ ] **Step 8: Прогнать все юнит-тесты**

Run: `pnpm test:int`
Expected: PASS — все файлы из Задач 3, 5, 6, 7, 9, 10, 11.

- [ ] **Step 9: Застейджить**

```bash
git add -A src/app/\(frontend\)/_features/layout src/app/\(frontend\)/\[locale\]/layout.tsx src/globals/Footer
```

---

### Task 13: Сид-скрипт с контентом оригинала

**Files:**
- Create: `scripts/seed-layout.ts`
- Modify: `package.json` (добавить npm-скрипт `seed:layout`)
- Modify: `scripts/seed-prod.local.sh` (добавить шаг прогона)

**Interfaces:**
- Consumes: схемы из Задач 1 и 2, паттерн create-if-missing из `scripts/enrich-home-content.ts:77-118`.
- Produces: заполненные глобалы `header`/`footer` в обеих локалях и форму `newsletter` в коллекции `forms`.

Идемпотентность: скрипт заполняет глобал ТОЛЬКО если он пуст (у header пуст `navItems`, у footer пуст `linkColumns`) — правки редактора переживают повторные прогоны. Все записи идут с `context: { disableRevalidate: true }`, как в существующем сиде.

- [ ] **Step 1: Создать скрипт**

Файл `scripts/seed-layout.ts`:

```ts
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Form } from '@/payload-types'

const APP_LOGIN_EN = 'https://app.drug-card.io/login/en'

const toRichTextParagraph = (text: string) => ({
  root: {
    children: [
      {
        children: [{ text, type: 'text', version: 1 }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const customLink = (label: string, url: string) => ({
  link: { label, type: 'custom' as const, url },
})

// ---------- Форма подписки ----------

const NEWSLETTER_SLUG = 'newsletter'

const NEWSLETTER_COPY = {
  en: {
    confirmation: 'Thank you for subscribing!',
    emailLabel: 'E-mail',
    submit: 'Subscribe',
  },
  uk: {
    confirmation: 'Дякуємо за підписку!',
    emailLabel: 'E-mail',
    submit: 'Підписатися',
  },
}

const seedNewsletterForm = async (payload: Payload) => {
  const existing = await payload.find({
    collection: 'forms',
    limit: 1,
    where: { slug: { equals: NEWSLETTER_SLUG } },
  })

  if (existing.docs[0]) {
    payload.logger.info('Form "newsletter" already exists — left untouched')
    return existing.docs[0] as Form
  }

  const created = await payload.create({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(NEWSLETTER_COPY.en.confirmation),
      confirmationType: 'message',
      fields: [
        {
          blockType: 'email',
          label: NEWSLETTER_COPY.en.emailLabel,
          name: 'email',
          required: true,
        },
      ] as NonNullable<Form['fields']>,
      slug: NEWSLETTER_SLUG,
      submitButtonLabel: NEWSLETTER_COPY.en.submit,
      title: 'Newsletter',
    },
    locale: 'en',
  })

  const createdRows = (created.fields || []) as NonNullable<Form['fields']>

  const toUkRow = (row: NonNullable<Form['fields']>[number]) => ({
    ...row,
    label: NEWSLETTER_COPY.uk.emailLabel,
  })

  await payload.update({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(NEWSLETTER_COPY.uk.confirmation),
      fields: createdRows.map(toUkRow),
      submitButtonLabel: NEWSLETTER_COPY.uk.submit,
    },
    id: created.id,
    locale: 'uk',
  })

  payload.logger.info('Created form "newsletter"')

  return created as Form
}

// ---------- Header ----------

const HEADER_EN = {
  ctaButtons: {
    demoButtonLabel: 'Request a Demo',
    loginButton: { label: 'Log In', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN },
  },
  navItems: [
    {
      ...customLink('Why DrugCard?', '/why-drugcard'),
      subItems: [
        customLink('About Us', '/about-us'),
        customLink('Implementation & Onboarding', '/implementation-onboarding'),
        customLink('Compliance', '/compliance'),
        customLink('Audit Readiness', '/audit-readiness'),
      ],
    },
    {
      ...customLink('Solution', '/solution'),
      subItems: [
        customLink('DrugCard Platform', '/local-literature'),
        customLink('Simple Search by DrugCard', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('Adverse Event Database', '/adverse-event-database'),
        customLink('eCTDlight', '/ectdlight'),
      ],
    },
    {
      ...customLink('Services', '/services'),
      subItems: [
        customLink('LQPPV Services', '/lqppv-services'),
        customLink('Signal Management', '/signal-management'),
        customLink('PSUR Services', '/psur-services'),
        customLink('ICSR Management', '/icsr-management'),
        customLink('PSMF Management', '/psmf-management'),
        customLink('Risk Management Plan', '/risk-management-plan'),
      ],
    },
    {
      ...customLink('Resources', '/resources'),
      subItems: [
        customLink('Blog', '/blog'),
        customLink('Case Studies', '/case-studies'),
        customLink('Documents', '/documents'),
        customLink('News', '/news'),
      ],
    },
    {
      ...customLink('Contact us', '/contact-us'),
      subItems: [customLink('Partnership', '/partnership')],
    },
  ],
}

const HEADER_UK = {
  ctaButtons: {
    demoButtonLabel: 'Замовити демо',
    loginButton: { label: 'Увійти', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN },
  },
  navItems: [
    {
      ...customLink('Чому DrugCard?', '/why-drugcard'),
      subItems: [
        customLink('Про нас', '/about-us'),
        customLink('Впровадження', '/implementation-onboarding'),
        customLink('Комплаєнс', '/compliance'),
        customLink('Готовність до аудиту', '/audit-readiness'),
      ],
    },
    {
      ...customLink('Рішення', '/solution'),
      subItems: [
        customLink('Платформа DrugCard', '/local-literature'),
        customLink('Simple Search', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('База побічних явищ', '/adverse-event-database'),
        customLink('eCTDlight', '/ectdlight'),
      ],
    },
    {
      ...customLink('Послуги', '/services'),
      subItems: [
        customLink('Послуги ЛУВБ', '/lqppv-services'),
        customLink('Управління сигналами', '/signal-management'),
        customLink('Послуги PSUR', '/psur-services'),
        customLink('Управління ICSR', '/icsr-management'),
        customLink('Управління PSMF', '/psmf-management'),
        customLink('План управління ризиками', '/risk-management-plan'),
      ],
    },
    {
      ...customLink('Ресурси', '/resources'),
      subItems: [
        customLink('Блог', '/blog'),
        customLink('Кейси', '/case-studies'),
        customLink('Документи', '/documents'),
        customLink('Новини', '/news'),
      ],
    },
    {
      ...customLink("Зв'язатися з нами", '/contact-us'),
      subItems: [customLink('Партнерство', '/partnership')],
    },
    // Пункт существует только в украинской версии — ровно как на оригинале.
    customLink('Заходи БПР', '/zakhody-bpr'),
  ],
}

const seedHeader = async (payload: Payload) => {
  const current = await payload.findGlobal({ locale: 'en', slug: 'header' })

  if (current && current.navItems && current.navItems.length > 0) {
    payload.logger.info('Global "header" already filled — left untouched')
    return
  }

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: HEADER_EN as never,
    locale: 'en',
    slug: 'header',
  })

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: HEADER_UK as never,
    locale: 'uk',
    slug: 'header',
  })

  payload.logger.info('Seeded global "header" (en + uk)')
}

// ---------- Footer ----------

const FOOTER_SOCIALS = [
  { platform: 'telegram' as const, url: 'https://t.me/drugcard' },
  { platform: 'facebook' as const, url: 'https://www.facebook.com/drugcard.io' },
  { platform: 'youtube' as const, url: 'https://www.youtube.com/@drugcard' },
  { platform: 'linkedin' as const, url: 'https://www.linkedin.com/company/drugcard/' },
]

const FOOTER_EN = {
  contacts: {
    address:
      'ДрагКардс Україна, Україна, 79042, Львівська область, місто Львів, вулиця Шевченка Т., будинок 111 а, офіс 6',
    email: 'sales@drug-card.io',
    phone: '+372 5565 7104',
    tagline: 'Driving Pharmacovigilance forward with AI-enabled Data Intelligence',
  },
  legal: {
    copyright: '© Copyright 2021-2026 DrugCard OÜ. All rights reserved.',
    legalLinks: [
      customLink('Privacy Policy', '/privacy-policy'),
      customLink('Quality Policy', '/quality-policy'),
    ],
  },
  linkColumns: [
    {
      links: [
        customLink('Why DrugCard?', '/why-drugcard'),
        customLink('DrugCard Platform', '/local-literature'),
        customLink('Simple Search', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('Adverse Event Database', '/adverse-event-database'),
      ],
      title: 'Product',
    },
    {
      links: [
        customLink('Services', '/services'),
        { link: { label: 'Log In', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN } },
        customLink('Blog', '/blog'),
        customLink('Documents', '/documents'),
        customLink('Case Studies', '/case-studies'),
      ],
      title: 'Resources',
    },
    {
      links: [
        customLink('Partnership', '/partnership'),
        customLink('Contact us', '/contact-us'),
        customLink('About us', '/about-us'),
        customLink('Заходи БПР', '/zakhody-bpr'),
      ],
      title: 'Company',
    },
  ],
  newsletter: { heading: 'Sign up and receive the latest tips via email' },
}

const FOOTER_UK = {
  contacts: {
    address:
      'ДрагКардс Україна, Україна, 79042, Львівська область, місто Львів, вулиця Шевченка Т., будинок 111 а, офіс 6',
    tagline: 'Розвиваємо фармаконагляд за допомогою AI та аналітики даних',
  },
  legal: {
    copyright: '© Copyright 2021-2026 DrugCard OÜ. Усі права захищені.',
    legalLinks: [
      customLink('Політика конфіденційності', '/privacy-policy'),
      customLink('Політика якості', '/quality-policy'),
    ],
  },
  linkColumns: [
    {
      links: [
        customLink('Чому DrugCard?', '/why-drugcard'),
        customLink('Платформа DrugCard', '/local-literature'),
        customLink('Simple Search', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('База побічних явищ', '/adverse-event-database'),
      ],
      title: 'Продукт',
    },
    {
      links: [
        customLink('Послуги', '/services'),
        { link: { label: 'Увійти', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN } },
        customLink('Блог', '/blog'),
        customLink('Документи', '/documents'),
        customLink('Кейси', '/case-studies'),
      ],
      title: 'Ресурси',
    },
    {
      links: [
        customLink('Партнерство', '/partnership'),
        customLink("Зв'язатися з нами", '/contact-us'),
        customLink('Про нас', '/about-us'),
        customLink('Заходи БПР', '/zakhody-bpr'),
      ],
      title: 'Компанія',
    },
  ],
  newsletter: { heading: 'Підпишіться та отримуйте актуальні новини на email' },
}

const seedFooter = async (payload: Payload, newsletterForm: Form) => {
  const current = await payload.findGlobal({ locale: 'en', slug: 'footer' })

  if (current && current.linkColumns && current.linkColumns.length > 0) {
    payload.logger.info('Global "footer" already filled — left untouched')
    return
  }

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: {
      ...FOOTER_EN,
      newsletter: { ...FOOTER_EN.newsletter, form: newsletterForm.id },
      socials: FOOTER_SOCIALS,
    } as never,
    locale: 'en',
    slug: 'footer',
  })

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: FOOTER_UK as never,
    locale: 'uk',
    slug: 'footer',
  })

  payload.logger.info('Seeded global "footer" (en + uk)')
}

const seedLayout = async () => {
  const payload = await getPayload({ config })

  const newsletterForm = await seedNewsletterForm(payload)
  await seedHeader(payload)
  await seedFooter(payload, newsletterForm)
}

await seedLayout()
process.exit(0)
```

- [ ] **Step 2: Добавить npm-скрипт**

В `package.json` в блок `"scripts"`, рядом с `"seed:home"`:

```json
    "seed:layout": "cross-env NODE_OPTIONS=--no-deprecation payload run scripts/seed-layout.ts",
```

- [ ] **Step 3: Проверить, что скрипт компилируется**

Run: `pnpm exec tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Запустить сид на локальной базе**

Run: `pnpm seed:layout`
Expected: в логах три строки — `Created form "newsletter"`, `Seeded global "header" (en + uk)`, `Seeded global "footer" (en + uk)`.

- [ ] **Step 5: Проверить идемпотентность — запустить повторно**

Run: `pnpm seed:layout`
Expected: три строки вида `already exists — left untouched` / `already filled — left untouched`; данные не перезаписаны.

- [ ] **Step 6: Добавить шаг в прод-сид**

В конец `scripts/seed-prod.local.sh` (файл в .gitignore, не коммитится — правку делаем локально):

```sh
echo '--- 3/3: сид хедера и футера ---'
pnpm seed:layout
```

и поправить нумерацию предыдущих шагов на `1/3` и `2/3`.

- [ ] **Step 7: Застейджить**

```bash
git add scripts/seed-layout.ts package.json
```

`scripts/seed-prod.local.sh` в .gitignore — не стейджится.

---

### Task 14: Финальная проверка целиком

**Files:**
- Test: `tests/e2e/frontend.e2e.spec.ts` (дополняется)

**Interfaces:**
- Consumes: всё, сделанное в Задачах 1–13.

- [ ] **Step 1: Посмотреть текущий e2e-тест, чтобы повторить его стиль**

Run: `cat tests/e2e/frontend.e2e.spec.ts`
Expected: увидеть, как поднимается страница и какие используются селекторы.

- [ ] **Step 2: Дописать e2e-проверку хедера и футера**

Добавить в `tests/e2e/frontend.e2e.spec.ts` (импорты `test`/`expect` там уже есть — не дублировать):

```ts
test.describe('site layout', () => {
  test('renders header navigation and footer contacts on the en home page', async ({ page }) => {
    await page.goto('http://localhost:3000/en')

    await expect(page.locator('header').getByRole('link', { name: 'Solution' })).toBeVisible()
    await expect(page.locator('footer').getByText('sales@drug-card.io')).toBeVisible()
  })

  test('switches locale while keeping the page', async ({ page }) => {
    await page.goto('http://localhost:3000/en/blog')

    await page.locator('header').getByRole('link', { name: 'UK' }).click()

    await expect(page).toHaveURL(/\/uk\/blog/)
  })

  test('opens the contact modal from the header demo button', async ({ page }) => {
    await page.goto('http://localhost:3000/en')

    await page.locator('header').getByRole('button', { name: 'Request a Demo' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
```

Если в проекте модалка рендерится без `role="dialog"` — заменить последнюю проверку на поиск по заголовку модалки (`page.getByText('Contact us')`), предварительно посмотрев разметку `ContactModalDialog`.

- [ ] **Step 3: Прогнать все юнит-тесты**

Run: `pnpm test:int`
Expected: PASS, все файлы.

- [ ] **Step 4: Прогнать e2e**

Run: `pnpm test:e2e`
Expected: PASS. Если падает из-за неподнятого dev-сервера — поднять `pnpm dev` в отдельном терминале и повторить.

- [ ] **Step 5: Проверить сборку**

Run: `pnpm build`
Expected: сборка проходит без ошибок типов и без ошибок пререндера.

- [ ] **Step 6: Ручная проверка в браузере**

Run: `pnpm dev`, пройти по чек-листу:

1. `/en` — хедер: логотип, 5 пунктов меню, у «Solution» при наведении открывается подменю, справа EN/UK, Log In, Request a Demo.
2. Клик «Request a Demo» → открывается контактная модалка.
3. Клик «UK» на `/en/blog` → `/uk/blog`, меню на украинском, появился пункт «Заходи БПР».
4. Футер: контакты (адрес, телефон, email кликабельны), 3 колонки ссылок, блок подписки, 4 иконки соцсетей, копирайт + 2 юр. ссылки.
5. Подписка: ввести email → отправить → сообщение об успехе; в админке `/admin/collections/form-submissions` появилась запись.
6. Сузить окно до ~375px: меню сворачивается в бургер, панель открывается и закрывается, внутри — все пункты, подпункты, Log In, Request a Demo, EN/UK.
7. Админка `/admin/globals/header`: изменить label пункта меню → сохранить → обновить сайт: новая подпись на месте (сработал revalidateTag).

- [ ] **Step 7: Застейджить**

```bash
git add tests/e2e/frontend.e2e.spec.ts
```

- [ ] **Step 8: Сообщить пользователю итог**

Перечислить: что сделано, результаты `pnpm test:int`, `pnpm test:e2e`, `pnpm build`, какие файлы застейджены и ждут его коммита. Не утверждать, что что-то работает, без вывода команды.

---

## Заметки о расхождениях со спекой

Спека `2026-07-20-header-footer-design.md` не покрывала два пункта, добавленных в план по ходу:

1. **Логотип** (Задача 3) — шаблонный `Logo.tsx` рендерит логотип Payload; для копии нужны SVG DrugCard в двух вариантах (цветной для белого хедера, белый для тёмного футера). Шаблонный компонент не трогаем — он используется админкой/шаблоном.
2. **Строки i18n** (Задача 4) — namespace `Layout` в `messages/*.json` для системных подписей (aria-метки бургера, подменю, переключателя языка, плейсхолдер и статусы подписки). Контентные строки по-прежнему целиком в CMS; в messages только то, что принадлежит обёртке, а не контенту, — тот же принцип, что в спеке форм.
