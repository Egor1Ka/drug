# Core Roadmap — что осталось реализовать

Документ фиксирует, какой динамический контент есть на оригинале
[drug-card.io](https://drug-card.io/) (маркетинговый сайт SaaS-платформы по
фармаконадзору: WordPress + Yoast, блог + каталоги + лид-формы) и **чего не
хватает в нашем Payload-core**, чтобы переписать движок.

Формат по каждому пункту: **что уже есть** → **чего не хватает** (список
пробелов, не план реализации).

---

## Точка отсчёта — что уже в core

- **Коллекции:** `Posts`, `Categories`, `Tags`, `Media`, `PageContent`
  (+ блоки `faq` / `testimonials` / `logos` / `stats` / `team`), `Users`
- **Глобалы:** `Header`, `Footer`
- **Локализация:** сконфигурирована (`localization.locales`, `defaultLocale`)
- **Плагины:** `plugin-form-builder`, `plugin-seo`, `plugin-redirects`,
  `plugin-nested-docs`, `storage-vercel-blob`
- **Фичи (frontend):** `blog`, `contact` (модалка), `forms` (`FormRenderer`),
  `home`, `page-content`, `layout`; generic-роут `[slug]`
- **RichText-блоки:** `Banner`, `CallToAction`, `Code`, `MediaBlock`,
  `RelatedPosts`

Вывод: почти ничего не строим «с нуля» — **дозакрываем пробелы**.

---

## 1. News (Новости)

Отдельная коллекция, не блог (в оригинале свой `news-updates-sitemap.xml` и
отдельный пункт меню).

**Чего не хватает:**
- [x] Коллекция `News`: заголовок, slug, дата, excerpt, тело, обложка, SEO-поля
- [x] Роут `/news` + `/news/[slug]`, листинг newest-first
- [x] `api/`-слой (`fetchPublishedNewsPage`, `fetchNewsBySlug`) по паттерну блога
- [x] Отдельный sitemap-тип (`/news-sitemap.xml`)

> Реализовано. Пункт меню «News» добавляется контент-редактором в
> глобале `Header` (navItems редактируемы), код не требует правок.

## 2. Case Studies (Кейсы)

Отдельная коллекция (свой `case-study-sitemap.xml`).

**Чего не хватает:**
- [ ] Коллекция `CaseStudies` + поля: компания/клиент, регион/страна,
      кол-во продуктов, результат (метрика), дата, тело
- [ ] Роут `/case-studies` + `/case-studies/[slug]`, листинг newest-first
      (без пагинации — их ~9)
- [ ] `api/`-слой + SEO + sitemap-тип

## 3. Documents / Resources (gated PDF)

Про лидогенерацию, не просто контент.

**Чего не хватает:**
- [ ] Коллекция `Documents`: обложка, заголовок, описание, PDF-файл (Media)
- [ ] Связка «форма → выдача файла»: gated-форма (First/Last name, Email) →
      submission → отдача/письмо со ссылкой на PDF
- [ ] Логика лидов (submissions даёт form-builder, но нужен сценарий
      «после сабмита открыть/прислать файл»)
- [ ] Листинг `/documents` с карточками + триггером формы

## 4. Local Medical Journals (файлы по странам)

**Чего не хватает:**
- [ ] Модель «журналы по стране»: страна, превью, скачиваемый файл,
      gated-попап (как Documents)
- [ ] Решение по масштабу: витрина по странам (Greece/Spain/Croatia…) vs
      заявленная «база 2200+ журналов / 138 стран». Если нужна реальная база —
      коллекция `Journal` (страна / язык / название) + фильтр/поиск
      (сейчас на сайте только скачивание)
- [ ] Роут `/local-medical-journals`

## 5. Authors (Авторы)

Сейчас автор — вероятно строка/`Users`; на сайте есть архивы авторов
(`/blog/author/artem/`).

**Чего не хватает:**
- [ ] Коллекция `Authors` (имя, аватар, био, slug) либо использование `Users`
- [ ] Связь `Post → Author`
- [ ] Роут-архив `/blog/author/[slug]` (лента постов) + author-sitemap

## 6. Forms & Lead capture

Плагин и `FormRenderer` есть — сценарии не закрыты.

**Чего не хватает (проверить/добить):**
- [ ] Email-уведомления на сабмит (confirmation + внутреннее письмо) —
      настроен ли email-adapter
- [ ] Анти-спам (honeypot/captcha) и валидация
- [ ] Все типы форм: Request a Demo, Newsletter, gated-download (п.3–4),
      Contact (проверить, что модалка реально шлёт submission)
- [ ] Book a 15-minute meeting — интеграция с внешним календарём
      (Calendly/аналог): форма или embed
- [ ] Хранение/экспорт лидов, опц. вебхук в CRM

## 7. Pages / Layout-builder

`PageContent` + `[slug]` + 5 блоков — фундамент есть.

**Чего не хватает (блоки под ~30 лендингов):**
- [ ] Новые блоки: Hero, CTA-секция, Comparison table (Manual vs DrugCard),
      feature/steps (Implementation & Onboarding), pricing/plans (если нужно),
      embed/video
- [ ] Проверить, что `[slug]` рендерит произвольный набор блоков (не только
      home) и контент-редактор может собрать новый лендинг сам
- [ ] Хлебные крошки для вложенных страниц (nested-docs уже стоит — подключить)

## 8. Переиспользуемые сущности (коллекции для блоков)

Блоки faq/testimonials/logos/stats/team есть, но данные, вероятно, инлайн.

**Чего не хватает (решить):**
- [ ] Нужны ли отдельные коллекции `Testimonials` / `ClientLogos` /
      `TeamMembers`, чтобы переиспользовать одни данные на разных страницах.
      Если да — вынести в коллекции + связи

## 9. SEO / Sitemap — расширить на всё

Плагин `seo` стоит, `next-sitemap` правится.

**Чего не хватает:**
- [ ] SEO-поля на все новые коллекции: News, Case Studies, Documents,
      Journals, Authors
- [ ] Раздельные sitemap по типам (post / page / news / case-study / author)
- [ ] Canonical / hreflang для локализованных версий

## 10. Localization — довести

Конфиг локалей есть.

**Чего не хватает:**
- [ ] `localized: true` на нужных полях новых коллекций
- [ ] Локализованные slug'и (в оригинале укр. `zakhody-bpr`, `...-en`) —
      стратегия слагов по локали
- [ ] hreflang в sitemap/метадате

## 11. Продуктовые инструменты — за скоупом core

`Simple Search`, `Adverse Event Database`, `Regulatory Intelligence` — реальные
приложения-поисковики по БД, не CMS.

**Что сделать:**
- [ ] Зафиксировать границу: в маркетинговом core это только лендинги этих
      продуктов (Pages); сами инструменты — отдельная система/скоуп

---

## Порядок закрытия (по стоимости и зависимостям)

1. **News + Case Studies** — дешёвое расширение блог-паттерна (проверка
   переиспользуемости core)
2. **Authors** — маленькое, но трогает Posts и sitemap
3. **Forms: email + анти-спам + gated-сценарий** — разблокирует п.4
4. **Documents + Journals** — поверх gated-форм
5. **Блоки Pages** (Hero / CTA / Comparison) — чтобы контент-команда собирала
   лендинги сама
6. **SEO/sitemap на все коллекции + localization-поля** — сквозным проходом
