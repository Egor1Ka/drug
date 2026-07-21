# Дизайн: Хедер и футер — копия drug-card.io, редактируемая через Payload

Дата: 2026-07-20
Статус: на ревью

## Цель

Скопировать хедер и футер оригинала drug-card.io и сделать весь их контент редактируемым из админки Payload на обоих языках (en/uk): пункты меню с выпадающими подменю, кнопки CTA, контакты, колонки ссылок, соцсети, блок подписки, копирайт и юридические ссылки. Редактор меняет что угодно без разработчика; структура может отличаться между локалями (например, пункт «БПР» только в uk).

## Принятые решения

| Решение | Выбор |
| --- | --- |
| Схема | Структурированные глобалы (вариант A): поля под конкретную структуру оригинала, не blocks-конструктор |
| Подменю в хедере | Да: пункт меню = ссылка + опциональный массив под-ссылок (выпадашка) |
| «Request a Demo» | Открывает существующую контактную модалку (`useContactModal`), URL нет; текст кнопки из CMS |
| «Log In» | Обычная ссылка `link()` из CMS (внешний URL) |
| Переключатель языка | EN/UK в хедере через next-intl (сохраняет текущий путь) |
| Подписка в футере | Рабочая, через фичу `forms`: форма `newsletter` в form-builder, сабмиты в Form Submissions |
| Переключатель темы | Убираем из футера (на оригинале тёмной темы нет); `InitTheme`/провайдеры не трогаем |
| Локализация | Массивы (`navItems`, `linkColumns`, `legalLinks`) `localized: true` — структура может отличаться между локалями; fallback en |
| Где живёт фронт-код | Новая фича `_features/layout` (хедер + футер — общий каркас сайта); старые `src/globals/*/Component*.tsx` удаляются |
| Иконки соцсетей | Инлайн-SVG в проекте, маппинг `platform → иконка` конфиг-объектом; без новых библиотек |

## 1. Payload

### Глобал `Header` (`src/globals/Header/config.ts`)

Slug `header`, `access.read: () => true`, хук `revalidateHeader` — без изменений. Поля:

- `navItems` — array, `localized: true`, `maxRows: 8`. Каждый пункт:
  - `link()` (`appearances: false`) — сам пункт всегда кликабельная ссылка (внутренняя страница или custom URL);
  - `subItems` — array of `link()` (`appearances: false`), опционально. Заполнен → пункт рендерится с выпадающим подменю.
- `ctaButtons` — group:
  - `loginButton` — `link({ appearances: false, overrides: { localized: true } })` — локализуется вся link-группа целиком (label и URL: en-версия может вести на `/login/en`, uk — на `/login/ua`);
  - `demoButtonLabel` — text, `localized: true`, required.

RowLabel для `navItems` обновить под новую форму данных (показывает `link.label`).

### Глобал `Footer` (`src/globals/Footer/config.ts`)

Slug `footer`, access и хук `revalidateFooter` — без изменений. Поля:

- `contacts` — group: `address` (textarea, `localized`), `phone` (text), `email` (text), `tagline` (text, `localized`);
- `linkColumns` — array, `localized: true`, `maxRows: 4`: `title` (text) + `links` (array of `link()`, `appearances: false`);
- `socials` — array, НЕ localized: `platform` (select: `telegram | facebook | youtube | linkedin | instagram | x`) + `url` (text, required);
- `newsletter` — group: `heading` (text, `localized`) + `form` (relationship → `forms`);
- `legal` — group: `copyright` (text, `localized`) + `legalLinks` (array of `link()`, `localized`).

Про label внутри `link()`: само поле `label` в `link()` не локализовано, и это не нужно — везде, где link-поля лежат внутри массива с `localized: true`, каждая локаль хранит свой массив целиком (со своими label и URL). Отдельная локализация нужна только `loginButton` (группа вне локализованных массивов) — решено локализацией всей link-группы (см. Header выше).

После изменения схемы: `pnpm generate:types` (обновить `payload-types.ts`).

## 2. Фронтенд — фича `_features/layout`

```
src/app/(frontend)/_features/layout/
  api/
    header.ts      ← fetchHeaderData(locale) — getCachedGlobal('header', 1, locale)
    footer.ts      ← fetchFooterData(locale) — getCachedGlobal('footer', 1, locale)
  ui/
    SiteHeader.tsx           ← серверный: fetchHeaderData + композиция в HeaderLayout
    HeaderLayout.tsx         ← слоты Object.assign: .Logo / .Nav / .Actions (sticky, контейнер, отступы)
    HeaderNav.tsx            ← клиентский: пункты меню верхнего уровня
    NavDropdown.tsx          ← подменю: hover/фокус на десктопе, тап на мобиле
    MobileMenu.tsx           ← бургер + выезжающая панель (вся навигация + CTA + языки)
    LocaleSwitcher.tsx       ← EN/UK: Link из @/i18n/navigation, сохраняет pathname
    LoginButton.tsx          ← CMSLink из данных loginButton
    RequestDemoButton.tsx    ← клиентский: useContactModal().open, текст из demoButtonLabel
    SiteFooter.tsx           ← серверный: fetchFooterData + композиция в FooterLayout
    FooterLayout.tsx         ← слоты: .Contacts / .Columns / .Newsletter / .Socials / .Legal
    FooterContacts.tsx       ← лого, адрес, tel:/mailto:-ссылки, слоган
    FooterLinkColumns.tsx    ← колонки: заголовок + CMSLink-список
    FooterSocials.tsx        ← иконки по PLATFORM_ICONS (конфиг-объект)
    NewsletterSignup.tsx     ← клиентский: email-инпут + кнопка, сабмит POST /api/form-submissions
    FooterLegal.tsx          ← копирайт + юр. ссылки
  index.ts                   ← публичный API: SiteHeader, SiteFooter
```

Правила:

- `[locale]/layout.tsx`: заменить импорты `Header`/`Footer` из `@/globals/*` на `SiteHeader`/`SiteFooter` из `@frontend/_features/layout`. Другие изменения layout не нужны.
- Удалить `src/globals/Header/Component.tsx`, `Component.client.tsx`, `Nav/index.tsx`, `src/globals/Footer/Component.tsx`. `config.ts`, хуки и RowLabel остаются (бэкенд/админка).
- Видимость секций — только на верхнем уровне через `<Show when={...}>`: пустые `socials` → блока нет; нет `newsletter.form` → блока подписки нет; и т.д. Редактор «выключает» часть футера, очистив поле.
- `NewsletterSignup` НЕ использует `FormRenderer` (там вся форма вертикальная, тут инлайн инпут+кнопка), но сабмитит в тот же эндпоинт `POST /api/form-submissions` `{ form: id, submissionData: [{ field: 'email', value }] }`. Имя email-поля берётся из привязанной формы (первое поле типа `email`); тексты кнопки и успеха — `submitButtonLabel` / `confirmationMessage` формы. Состояния idle → sending → success/error, как в FormRenderer.
- `RequestDemoButton` использует `useContactModal` из `@frontend/_features/contact` — межфичевый импорт только через публичный API фичи.
- Стили Tailwind по оригиналу: белый sticky-хедер с тенью при скролле, тёмный футер; шрифт Nunito уже подключён.

## 3. Данные и кеширование

- `getCachedGlobal(slug, depth: 1, locale)` — depth 1 нужен, чтобы резолвились `reference`-ссылки (pages/posts) и relationship `newsletter.form`.
- Кеш-теги `global_header` / `global_footer` уже инвалидируются хуками `revalidateHeader` / `revalidateFooter` при сохранении глобала — работает для всех локалей (тег общий).
- Новые страницы для ссылок меню не создаём: ссылки на ещё не существующие разделы сидируются как custom URL (`/why-drugcard` и т.п.) — до создания страниц дают 404, это ожидаемо и правится редактором.

## 4. Сид

Новый скрипт `scripts/seed-layout.ts` + npm-скрипт `seed:layout` (`payload run`), идемпотентный:

- Форма `newsletter` (create-if-missing, по образцу `contact-us` в `enrich-home-content.ts`): одно поле `email` (required), `submitButtonLabel` «Subscribe», `confirmationMessage` «Thank you for subscribing!»; uk-локаль — переведённые подписи.
- Глобал `header`: заполняется, только если `navItems` пуст (не затирать правки редактора). Контент en — с оригинала: Why DrugCard? / Solution / Services / Resources / Contact us с их подменю; loginButton → `https://app.drug-card.io/login/en`; demoButtonLabel «Request a Demo». Затем update в uk-локали с переводами (в uk дополнительно пункт «БПР» → `/zakhody-bpr`).
- Глобал `footer`: аналогично, только если `linkColumns` пуст. Контакты (адрес Львов, `+372 5565 7104`, `sales@drug-card.io`, tagline «Driving Pharmacovigilance forward…»), 3 колонки ссылок как на оригинале, соцсети (telegram/facebook/youtube/linkedin — URL с оригинала), newsletter.heading «Sign up and receive the latest tips via email», legal: копирайт «© Copyright 2021–2026 DrugCard OÜ. All rights reserved.» + Privacy Policy, Quality Policy.

## 5. Ошибки и краевые случаи

- Глобалы пустые (до сида) → хедер: лого + CTA-заглушек нет, рендерится только то, что заполнено; футер: только копирайт-строка, если и она пуста — пустой тёмный блок не рендерим (`<Show>` на каждом уровне). Сайт не падает.
- `newsletter.form` не привязана или в форме нет email-поля → блок подписки скрыт.
- Сабмит подписки упал (сеть/валидация) → состояние error, введённый email не теряется, можно повторить.
- uk-локаль не заполнена → fallback en (глобальная настройка `fallback: true`).
- Подменю на тач-устройствах: первый тап открывает список, переход — по тапу на под-ссылку; пункт без subItems — обычная ссылка.
- Клавиатура: дропдауны открываются по фокусу/Enter, закрываются по Escape; aria-expanded на триггерах.

## 6. Проверка

1. `pnpm generate:types` + tsc/`pnpm lint` без ошибок.
2. `pnpm seed:layout` → в админке: глобалы Header/Footer заполнены в en и uk; форма `newsletter` существует; повторный прогон ничего не перезаписывает.
3. На сайте (обе локали): хедер с подменю (hover/тап), Log In — внешняя ссылка, Request a Demo открывает модалку; переключатель EN/UK сохраняет текущий путь.
4. Футер: все секции как на оригинале (контакты, 3 колонки ссылок, подписка, соцсети, юр. блок), подписка: сабмит email → запись в Form Submissions + сообщение успеха.
5. Редактор меняет label пункта меню / добавляет колонку в футере → после сохранения контент на сайте обновился (revalidate-тег).
6. Мобильная вёрстка: бургер-меню со всей навигацией, CTA и языками; футер складывается в одну колонку.
