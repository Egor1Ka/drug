# Дизайн: page-content — CMS-контент для сверстанных вручную страниц

Дата: 2026-07-18
Статус: утверждён (подход page-content выбран после сравнения с «реестром секций» и «коллекцией на тип контента»)

## Цель

Маркетинговые страницы (главная и будущие) верстаются вручную в коде. Часть контента на них — FAQ, слайдеры отзывов, логотипы клиентов, цифры статистики — редактируется через админку Payload. Редактор управляет ТОЛЬКО содержимым; расположение секций, порядок и вёрстка жёстко заданы кодом. Это не page builder.

## Принятые решения

| Решение | Выбор |
| --- | --- |
| Модель хранения | Одна коллекция `page-content`; 1 документ = 1 сверстанная страница |
| Состав документа | Blocks-поле `sections`; типы блоков = виды контента (faq, testimonials, logos, stats, team) |
| Адресация из кода | Пара `pageKey` + `sectionKey`; код достаёт секции по ключу, порядок блоков в админке ни на что не влияет |
| Несколько секций одного типа на странице | Да — несколько блоков одного типа с разными `sectionKey` |
| Шаринг контента между страницами | Нет в v1; при реальной необходимости добавим reference-блок на общую секцию |
| Локализация | Текстовые поля `localized: true` (en/uk, fallback en — уже настроено) |
| Drafts / versions / live preview | Выключены в v1 |
| Ревалидация | afterChange/afterDelete-хук → `revalidatePath` для всех локалей страницы |

## 1. Payload

### Коллекция `src/collections/PageContent/index.ts`

- `slug: 'page-content'`
- `admin: { useAsTitle: 'pageKey', defaultColumns: ['pageKey', 'updatedAt'] }`
- Доступ: `read: anyone`, `create/update/delete: authenticated` (как у остальных коллекций)
- Поля:
  - `pageKey` — text, `required`, `unique`, `index`. Конвенция: `home` → `/`, иначе `/<pageKey>` (например `pricing` → `/pricing`). НЕ локализуется.
  - `sections` — blocks, `admin.initCollapsed: true`. Валидация поля: `sectionKey` уникален в пределах документа (кастомный `validate`, дубликат не даёт сохранить).

### Типы блоков (`src/collections/PageContent/blocks.ts`)

Каждый блок начинается с `sectionKey` (text, required, НЕ локализуется) и имеет `interfaceName` для генерации типов.

| Блок | `interfaceName` | Поля контента |
| --- | --- | --- |
| `faq` | `FaqSectionBlock` | `heading` text localized; `items` array (min 1): `question` text localized required, `answer` richText localized required |
| `testimonials` | `TestimonialsSectionBlock` | `heading` text localized; `items` array: `quote` textarea localized required, `authorName` text required, `authorRole` text localized, `photo` upload→media, `link` text |
| `logos` | `LogosSectionBlock` | `heading` text localized; `items` array: `logo` upload→media required, `link` text |
| `stats` | `StatsSectionBlock` | `items` array: `value` text required (например `100+`), `label` text localized required, `sublabel` text localized optional |
| `team` | `TeamSectionBlock` | `heading` text localized; `items` array: `name` text required, `role` text localized required, `description` textarea localized, `photo` upload→media, `linkedinUrl` text |

Блок `team` добавлен по итогам ревизии главной drug-card.io: секция «Management team» (3 профиля) — повторяемый контент, уместный для CMS. Hero, видео, карточки «проблем», списки фич, сегменты и CTA остаются статикой в коде.

Это контент-блоки без render-компонентов — в `src/blocks/` (билдерные блоки шаблона) они НЕ добавляются. Новый вид контента в будущем = новый блок в этом файле + типизированный геттер + вёрстка в коде страницы.

### Хук ревалидации `src/collections/PageContent/hooks/revalidatePageContent.ts`

По образцу `revalidatePost`:

- `pageKeyToPath(pageKey)`: `home` → `''`, иначе `/${pageKey}`
- afterChange и afterDelete: для каждой локали из `routing.locales` (`@/i18n/routing`) вызвать `revalidatePath('/' + locale + path)`
- Уважает `context.disableRevalidate`

### payload.config.ts

Добавить `PageContent` в массив `collections`. После изменения схемы — `generate:types`.

## 2. Фронтенд — фича `page-content`

`src/app/(frontend)/_features/page-content/` (по конвенциям FSD из CLAUDE.md). `ui/` содержит канонические вьюхи блоков — `FaqAccordion`, `TestimonialsSlider`, `LogoCarousel`, `StatsRow`, `TeamCards` — они переиспользуются всеми страницами через публичный API фичи. Страничные фичи (`home` и будущие) держат только свои статичные секции и layout; заголовки, не входящие в блок (например, у stats), передаются вьюхе пропом.

### `api/pageContent.ts`

- `fetchPageContent = cache(async (pageKey: string, locale: TypedLocale) => ...)` — `payload.find` по `pageKey`, `limit: 1`, `pagination: false`, `overrideAccess: false`, `locale`; возвращает документ или `null`. Примитивные аргументы — чтобы `cache()` дедуплицировал вызовы render + generateMetadata.
- Геттеры секций — каррированная фабрика по дискриминатору `blockType`, поверх неё типизированные хелперы:

```ts
const sectionOfType =
  <T extends SectionBlock>(blockType: T['blockType']) =>
  (content: PageContent | null, sectionKey: string): T | null => { ... }

export const getFaqSection = sectionOfType<FaqSectionBlock>('faq')
export const getTestimonialsSection = sectionOfType<TestimonialsSectionBlock>('testimonials')
export const getLogosSection = sectionOfType<LogosSectionBlock>('logos')
export const getStatsSection = sectionOfType<StatsSectionBlock>('stats')
export const getTeamSection = sectionOfType<TeamSectionBlock>('team')
```

Все геттеры принимают `null` (документ не создан) и возвращают `null`, если секция не найдена.

### `index.ts` (публичный API фичи)

Реэкспорт: `fetchPageContent`, пять геттеров, типы блоков.

### Использование на странице (пример)

```tsx
const content = await fetchPageContent('home', locale)
const faq = getFaqSection(content, 'faq-main')
const clientLogos = getLogosSection(content, 'client-logos')

// в JSX страницы, там где решает вёрстка:
<Show when={!!clientLogos}><LogoSlider section={clientLogos} /></Show>
<Show when={!!faq}><FaqAccordion section={faq} /></Show>
```

## 3. Ошибки и краевые случаи

- Документа для страницы нет → страница рендерится без CMS-секций (`Show`-гарды)
- В админке добавлен блок с ключом, которого нет в коде → просто нигде не отображается
- Два блока с одним `sectionKey` в документе → валидация не даёт сохранить
- Нет перевода на uk → `fallback: true` отдаёт en (уже настроено глобально)

## 4. Скоуп

В скоупе v1: коллекция `PageContent` с пятью блоками, хук ревалидации, фича `_features/page-content` (api + index), генерация типов.

Вне скоупа: вёрстка главной страницы (отдельная задача поверх этой), шаринг секций между страницами, drafts/live preview, seed-данные.

## 5. Проверка

1. `generate:types` и ESLint проходят.
2. В админке создаётся документ `home` с блоками faq + logos, контент заполняется на en и uk.
3. `fetchPageContent('home', 'uk')` возвращает локализованный контент; при отсутствии перевода — английский.
4. Правка контента в админке → страница обновляется (ревалидация обеих локалей).
5. Документ/секция отсутствуют → страница рендерится без ошибок.
