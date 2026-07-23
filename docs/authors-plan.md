# План: Authors (публичная коллекция + страница автора)

Решение (зафиксировано): **отдельная публичная коллекция `Authors`**.
`Users` остаётся закрытой auth-коллекцией только для логина; публичный контент
автора живёт в `Authors`.

## Что есть сейчас

- `Posts.authors` — `relationship (hasMany) → users`
  (`src/collections/Posts/index.ts`)
- `Users` — auth-коллекция, `read: authenticated` (приватная), только поле `name`
- Хук `populateAuthors` (`src/collections/Posts/hooks/populateAuthors.ts`) —
  костыль: вручную копирует `{id, name}` из закрытых users в `populatedAuthors`
- Публичной страницы автора и роута `/blog/author/[slug]` **нет**
- Ближайший готовый аналог — tag-архив
  (`src/app/(frontend)/[locale]/blog/tag/[slug]/page.tsx` + `fetchPostsByTag`)

## Что на оригинале (`/blog/author/artem/`)

- Имя, должность/роль, фото
- Большое многосекционное био (Expert Bio, Editorial Role, Skills, Background,
  Education, Regulatory Expertise) → это **один richText**, не набор полей
- Лента «Articles by X», newest-first: thumbnail + дата + заголовок
- CTA-секция снизу
- Хлебных крошек и пагинации нет

---

## Backend

### 1. Новая коллекция `Authors`
`src/collections/Authors/index.ts` + зарегистрировать в `payload.config.ts`.

- [ ] `access.read` — публичное чтение (в отличие от `Users`)
- [ ] Поля:
  - `name` (text, required)
  - `slug` (`slugField()`, из `name`) → URL `/blog/author/<slug>`
  - `avatar` (upload → `media`)
  - `title` (text, localized) — должность/роль
  - `bio` (richText, localized) — многосекционное био целиком
  - `socials` (array `{ platform, url }`, опц.)
  - `meta` (SEO-поля из plugin-seo — как в Posts)
- [ ] `useAsTitle: 'name'`, `defaultColumns: ['name','slug','updatedAt']`
- [ ] revalidate-хук на afterChange/afterDelete (как `revalidatePost`)

### 2. Перецепить `Posts.authors` на `authors`
- [ ] `relationTo: 'users'` → `relationTo: 'authors'`
- [ ] Пересмотреть хук `populateAuthors`: с публичной `Authors` костыль
      `populatedAuthors` больше не нужен — читаем связь напрямую через `depth`.
      Решить: удалить хук/поле `populatedAuthors` или оставить для обратной
      совместимости
- [ ] `defaultPopulate.authors` оставить `true` (уже есть)

### 3. Миграция данных (существующие посты)
- [ ] Посты сейчас ссылаются на **user-id**. Нужен скрипт: создать `Authors`
      из текущих users (минимум — Artem) и перепривязать `Posts.authors`
- [ ] Сид-скрипт по образцу `scripts/seed-layout.ts` (+ запись в `package.json`
      `seed:authors`)

### 4. SEO / sitemap
- [ ] Подключить `Authors` в конфиг plugin-seo (генерация meta title/desc)
- [ ] Добавить author-URL в `next-sitemap` (отдельный sitemap-тип, как для
      остальных коллекций)

---

## Frontend (фича `blog`)

### 5. Data-слой
`src/app/(frontend)/_features/blog/api/authors.ts`:
- [ ] `fetchAuthorBySlug(slug, locale)` — `cache()`, примитивные аргументы
      (зеркало `fetchTagBySlug`)
`src/app/(frontend)/_features/blog/api/posts.ts`:
- [ ] `fetchPostsByAuthor({ locale, page, slug })` — зеркало `fetchPostsByTag`,
      переиспользует `blogCardSelect` / `POSTS_PER_PAGE`
- [ ] Экспортировать оба из `_features/blog/index.ts` (публичный API фичи)

### 6. UI-компоненты
- [ ] `AuthorProfile.tsx` — шапка автора: avatar, name, title, richText-bio
      (screaming-naming, презентационный, данные приходят пропсами)
- [ ] Ленту статей переиспользовать из существующего `BlogArchive`
- [ ] Байлайн поста сделать **ссылкой** на `/blog/author/<slug>`
      (в `BlogCard` и/или `BlogPostLayout`) — сейчас автор не кликабелен

### 7. Роут-архив
`src/app/(frontend)/[locale]/blog/author/[slug]/page.tsx`
(копия tag-роута, слоты `BlogListingLayout`):
- [ ] `fetchAuthorBySlug` → `notFound()` если нет
- [ ] `fetchPostsByAuthor` → `BlogArchive` + `Pagination`
      (`hrefPattern="/blog/author/<slug>?page={page}"`)
- [ ] `AuthorProfile` в `BlogListingLayout.Header`
- [ ] `generateMetadata` (title/desc/og из данных автора)
- [ ] `revalidate = 600`, `setRequestLocale(locale)`

---

## Открытые вопросы (решить по ходу)

1. **Био**: один richText (проще, гибче) vs структурированные секции
   (Skills/Education отдельными полями). По умолчанию — richText.
2. **populatedAuthors**: удаляем костыль или оставляем? Рекомендация — удалить
   после перехода на публичную `Authors`.
3. **CTA снизу страницы автора** — переиспользовать существующий CTA-блок или
   пропустить на первой итерации.

---

## Порядок работ

1. Коллекция `Authors` + регистрация + SEO-конфиг
2. Перецепить `Posts.authors` → `authors`, разобраться с `populateAuthors`
3. Сид/миграция авторов + перепривязка постов
4. `api/authors.ts` + `fetchPostsByAuthor` + экспорт из index
5. `AuthorProfile` + кликабельный байлайн
6. Роут `/blog/author/[slug]` + `generateMetadata`
7. Sitemap-тип для авторов
8. Проверка: страница автора, лента, пагинация, ссылки из постов, локали
