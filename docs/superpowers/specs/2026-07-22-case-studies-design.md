# Спека: коллекция Case Studies (Кейсы)

Дата: 2026-07-22
Роадмап: `docs/core-roadmap.md` §2. Оригинал: https://drug-card.io/case-studies/

## Цель

Перенести в наш Payload-core раздел **Case Studies** с drug-card.io,
максимально близко к оригиналу. Это расширение уже реализованного паттерна
`News`: та же структура коллекции/фичи/роутов/sitemap **плюс** структурный
блок-снапшот с фактами кейса.

## Что на оригинале (зафиксировано осмотром)

- **Листинг** `/case-studies/` — карточки newest-first, **без пагинации** (их ~9).
  Карточка: заголовок-ссылка, короткий excerpt, дата, тег локации.
- **Детальная** `/case-study/<slug>/` (обрати внимание — **singular** в URL):
  - **Снапшот-бокс** сверху: `Client` (имя + логотип), `Location/Region`.
    Кол-во продуктов и метрика-результат где-то в снапшоте, где-то в теле.
  - **Тело**: три секции `Challenge → Solution → Results` (H2-заголовки),
    с пул-квотами клиента. Хедлайн-результат вида «94% Faster Article Review».
  - **CTA-секция** снизу: «Ready to Achieve Similar Results?» → book a demo.

## Решения (зеркалим оригинал максимально)

1. **Модель данных** — структурные поля для снапшота (не всё в richText).
2. **Роуты** — листинг `/case-studies`, детальная `/case-study/[slug]`
   (**singular**, как на оригинале). Отличие от нашего `/news`-паттерна
   осознанное: приоритет — точность копии.
3. **Пагинации нет** — `fetchAllCaseStudies` тянет все (`limit: 100`).
4. **CTA снизу — сразу**, переиспользуем существующий CTA-блок/секцию.
5. **Снапшот** рендерит те поля, что заполнены: `clientName` + `region` есть
   всегда; `productCount` и `resultMetric` — опциональны.

---

## Backend

### 1. Коллекция `CaseStudies`
`src/collections/CaseStudies/index.ts` — клон `News` (tabs Content/SEO,
`publishedAt` в sidebar, `slugField()`, `versions.drafts` c autosave,
access `authenticated` / `authenticatedOrPublished`, `livePreview`/`preview`
через `generatePreviewPath`). `slug: 'case-studies'`.

Поля в табе **Content**:

| Поле | Тип | Обяз. | Прим. |
|------|-----|:----:|------|
| `title` | text, localized | ✓ | заголовок кейса |
| `clientName` | text | ✓ | «Asphalion» |
| `clientLogo` | upload → media | | лого в снапшоте |
| `region` | text, localized | | «Spain», «Europe (16 countries)» |
| `productCount` | number | | опц. (не у всех) |
| `resultMetric` | text, localized | | хедлайн-метрика «94% Faster…» |
| `coverImage` | upload → media | | как в News |
| `excerpt` | textarea, localized | | текст карточки листинга |
| `content` | richText, localized | ✓ | тело Challenge/Solution/Results |

Таб **SEO** — идентичен News (`OverviewField`, `MetaTitleField`,
`MetaImageField`, `MetaDescriptionField`, `PreviewField`).

`defaultPopulate`: `title, slug, clientName, clientLogo, region, resultMetric,
excerpt, publishedAt, meta{image,description}` — всё, что нужно карточке.
`admin.defaultColumns`: `['title','clientName','publishedAt']`,
`useAsTitle: 'title'`.

### 2. Хук ревалидации
`src/collections/CaseStudies/hooks/revalidateCaseStudies.ts` — клон
`revalidateNews`: пути `/case-studies` (листинг) и `/case-study/${slug}`
(детальная), тег sitemap `case-studies-sitemap`.
`afterChange: [revalidateCaseStudies]`, `afterDelete: [revalidateCaseStudiesDelete]`.

### 3. Регистрация
- `src/payload.config.ts` — добавить `CaseStudies` в массив `collections`
  (импорт из `./collections/CaseStudies`).
- `src/utilities/generatePreviewPath.ts` — в `collectionPrefixMap` добавить
  `'case-studies': '/case-study'` (singular — под детальный роут).
- `src/app/(payload)/admin/importMap.js` — при необходимости (генерируется).
- `src/payload-types.ts` — регенерируется командой генерации типов.

---

## Frontend — новая фича `case-studies` (FSD)

`src/app/(frontend)/_features/case-studies/` с `api/`, `ui/`, `index.ts`
(публичный API). Внутри — относительные импорты; роуты импортируют только
из корня фичи.

### 4. Data-слой `api/case-studies.ts`
- `CASE_STUDY_CARD_SELECT` — поля карточки (`title, slug, clientName,
  clientLogo, region, resultMetric, excerpt, publishedAt, meta`).
- `fetchAllCaseStudies({ locale })` — `sort: '-publishedAt'`, `limit: 100`,
  `overrideAccess: false`, `select: CASE_STUDY_CARD_SELECT` (без пагинации).
- `fetchCaseStudyBySlug(slug, locale)` — в `cache()`, примитивные аргументы,
  учёт `draftMode` (зеркало `fetchNewsBySlug`).
- `fetchAllCaseStudySlugs()` — для `generateStaticParams`.

### 5. UI-компоненты `ui/`
- `CaseStudyCard.tsx` — карточка листинга (дата, заголовок-ссылка на
  `/case-study/<slug>`, excerpt, тег региона). Скриминг-нейминг, презентационный.
- `CaseStudyArchive.tsx` — сетка/лента карточек (`renderItem` — именованный колбэк).
- `CaseStudySnapshot.tsx` — **новый** блок-снапшот: `clientLogo`, `clientName`,
  `region`, `productCount`, `resultMetric`. Показывает только заполненные поля
  (через `<Show when={...}>`). Данные приходят пропсами.
- `CaseStudyListingLayout.tsx` — слоты `.Header`, `.Content` (как NewsListingLayout).
- `CaseStudyPostLayout.tsx` — слоты `.Header`, `.Snapshot`, `.Content`, `.Cta`
  (Object.assign), позиционирование страницы отдельно от компонентов.

### 6. `index.ts` — публичный API
Реэкспорт компонентов и `fetch*`/`CASE_STUDY_CARD_SELECT`.

---

## Роуты (тонкие)

### 7. Листинг `src/app/(frontend)/[locale]/case-studies/page.tsx`
- `setRequestLocale(locale)`, `revalidate = 600`.
- `fetchAllCaseStudies({ locale })` → `CaseStudyArchive` в
  `CaseStudyListingLayout.Content`, заголовок в `.Header`.
- Пагинации нет. `<Show when={docs.length > 0}>`.
- `generateMetadata` — статические title/description.

### 8. Детальная `src/app/(frontend)/[locale]/case-study/[slug]/page.tsx`
(+ `page.client.tsx` — `setHeaderTheme('light')`, как в News)
- `generateStaticParams` ← `fetchAllCaseStudySlugs`.
- `fetchCaseStudyBySlug(decodedSlug, locale)`; нет → `PayloadRedirects`.
- `CaseStudySnapshot` в `.Header` (после заголовка/даты/обложки).
- `RichText` тела в `.Content`.
- CTA-секция в `.Cta` (переиспользуемый CTA).
- `generateMetadata` ← `generateMeta({ doc })`.
- `LivePreviewListener` под `<Show when={draft}>`.

---

## SEO / sitemap

### 9. `src/app/(frontend)/(sitemaps)/case-studies-sitemap.xml/route.ts`
Клон `news-sitemap.xml/route.ts`: `unstable_cache` тег `case-studies-sitemap`,
`loc: ${SITE_URL}/case-study/${slug}` (**singular**, под детальный роут),
`lastmod: updatedAt`.

### 10. `next-sitemap.config.cjs`
- В `exclude` добавить `/case-studies-sitemap.xml`.
- В `additionalSitemaps` добавить `${SITE_URL}/case-studies-sitemap.xml`.

---

## Вне скоупа (YAGNI)
- Пагинация листинга (кейсов ~9).
- Фильтр по региону/клиенту (данные структурны — можно добавить позже).
- Отдельная коллекция клиентов/логотипов (логотип — upload прямо в кейсе).

## Порядок работ
1. Коллекция `CaseStudies` + хук + регистрация (`payload.config`,
   `generatePreviewPath`) + генерация типов.
2. `api/case-studies.ts`.
3. UI: `CaseStudySnapshot`, `CaseStudyCard`, `CaseStudyArchive`, оба layout.
4. Роут-листинг `/case-studies`.
5. Роут-детальная `/case-study/[slug]` + `page.client` + CTA.
6. `case-studies-sitemap.xml` + правки `next-sitemap.config.cjs`.
7. Проверка: листинг, детальная, снапшот, CTA, sitemap, локали, draft-preview.
