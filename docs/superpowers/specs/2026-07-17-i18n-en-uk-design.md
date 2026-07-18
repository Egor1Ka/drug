# Дизайн: локализация сайта EN/UK

Дата: 2026-07-17
Статус: утверждён (админка остаётся на английском)

## Цель

Двуязычный сайт: английский (дефолт) и украинский. Контент редактируется в Payload на обоих языках, фронтенд отдаёт страницы под `/en/...` и `/uk/...`.

## Принятые решения

| Решение | Выбор |
| --- | --- |
| Дефолтная локаль / fallback | `en` |
| URL-схема | Префикс у обоих языков: `/en/...`, `/uk/...`; с `/` редирект на язык браузера |
| Слаги | Общие (НЕ локализуются) — один slug на оба языка |
| UI-словари | next-intl |
| UI админки Payload | Остаётся английским (вне скоупа) |

## 1. Payload (контент)

### payload.config.ts

```ts
localization: {
  locales: [
    { label: 'English', code: 'en' },
    { label: 'Українська', code: 'uk' },
  ],
  defaultLocale: 'en',
  fallback: true, // нет укр-перевода → отдаём английский
}
```

### Поля, получающие `localized: true`

| Где | Поля |
| --- | --- |
| Posts | `title`, `content` (richText), `meta.*` (SEO) |
| Pages | `title`, `hero` (внутренние текстовые поля), `layout` (blocks-поле целиком — каждый язык может иметь свой набор блоков), `meta.*` (SEO) |
| Header (global) | `navItems` (массив целиком) |
| Footer (global) | `navItems` (массив целиком) |
| Categories | `title` |
| Tags | `title` |

НЕ локализуются: `slug` (везде), `heroImage`/media-связи, `publishedAt`, `authors`, `relatedPosts`, `categories`/`tags` (связи).

Для SEO-полей: через field overrides `seoPlugin` локализуются `meta.title` и `meta.description`; `meta.image` остаётся общим для обоих языков.

### Миграция существующего контента

Контент сейчас английский и его мало. После включения локализации значения полей должны храниться под ключом локали. План: пересохранить документы через админку или перезапустить seed. Отдельный скрипт миграции не пишем (YAGNI).

## 2. Next.js (роутинг + UI)

### Структура роутов

Все страницы переезжают под сегмент `[locale]`:

```
src/app/(frontend)/
  [locale]/
    layout.tsx        ← <html lang={locale}>, NextIntlClientProvider
    page.tsx
    [slug]/page.tsx
    blog/page.tsx
    blog/[slug]/page.tsx
    blog/page/[pageNumber]/page.tsx
    blog/tag/[slug]/page.tsx
  globals.css
  not-found.tsx
```

Роут `(sitemaps)` и `next/` остаются вне `[locale]`.

### next-intl

- `middleware.ts` в корне `src/`: `createMiddleware` c `localePrefix: 'always'`, `locales: ['en', 'uk']`, `defaultLocale: 'en'`. Matcher исключает `/admin`, `/api`, `/next`, статику и файлы sitemap.
- Конфиг локалей — один источник правды (`src/i18n/routing.ts`), его же импортируют middleware, layout и Payload-конфиг НЕ импортирует (в Payload локали задаются в `payload.config.ts`; список должен совпадать — фиксируется комментарием-ссылкой).
- Словари: `messages/en.json`, `messages/uk.json` — только UI-строки (пагинация, «Search», хлебные крошки, подписи дат и т.п.).
- Навигационные обёртки next-intl (`Link`, `redirect`, `usePathname`) — через `createNavigation`; фичевые компоненты используют их вместо `next/link` там, где ссылка внутренняя.
- Перед реализацией — актуальные доки next-intl через Context7 (правило libraries.md).

### Слой данных (`_features/blog/api/`)

Каждая fetch-функция получает `locale` первым/дополнительным примитивным аргументом и передаёт его в Payload:

```ts
fetchPostBySlug(slug, locale)   // cache() продолжает дедуплицировать: оба аргумента примитивы
fetchPublishedPostsPage(page, locale)
fetchAllCategories(locale)
...
```

### Статическая генерация

- `generateStaticParams` для локали задаётся один раз — на уровне `[locale]/layout.tsx` (`['en', 'uk']`). Страницы оставляют свои прежние params (слаги общие, поэтому один список слагов обслуживает оба языка); Next сам перемножает параметры родителя и ребёнка.
- `generateMetadata` получает locale из params и добавляет `alternates.languages` (hreflang: `en`, `uk`, `x-default`).

### Переключатель языка

Компонент `LanguageSwitcher` в Header: текущий pathname, замена префикса локали. Благодаря общим слагам маппинг не нужен. Живёт рядом с Header (это глобальный элемент, не фича блога).

### Sitemap и SEO

- Sitemap генерит записи для обоих префиксов.
- `<html lang>` из `[locale]/layout.tsx`.

### Ревалидация

Хуки `revalidatePost`, `revalidatePage`, `revalidateRedirects` и хуки Header/Footer обновляются: инвалидация путей с обоими префиксами (`/en/...` и `/uk/...`).

## 3. Вне скоупа

- Украинский UI админки Payload (`@payloadcms/translations`) — не делаем.
- Локализованные слаги — не делаем.
- Локализация форм form-builder — отложено (формы продолжают работать как есть).

## 4. Верификация

1. `tsc --noEmit` чистый.
2. `pnpm dev`: `/` редиректит по языку браузера; `/en/blog`, `/uk/blog` открываются; переключатель сохраняет страницу.
3. Админка: у локализованных полей появился переключатель en/uk; сохранение укр-версии поста меняет `/uk/...` и не трогает `/en/...`.
4. Страница без укр-перевода показывает английский контент (fallback), а не пустоту.
