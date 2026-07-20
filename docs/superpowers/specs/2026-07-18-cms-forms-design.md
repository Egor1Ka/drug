# Дизайн: CMS-формы — контактная модалка через form-builder

Дата: 2026-07-18
Статус: на ревью

## Цель

Редактор управляет формами из админки: состав полей, подписи (en/uk), текст кнопки, сообщение успеха. Заявки посетителей сохраняются в админке (Form Submissions). Никакой отправки во внешние сервисы: без почты, без CRM, без капчи (v1). Все CTA-кнопки сайта открывают одну модалку с формой `contact-us`.

## Принятые решения

| Решение | Выбор |
| --- | --- |
| Хранилище форм | Плагин `@payloadcms/plugin-form-builder` (уже установлен): коллекции Forms + Form Submissions |
| Привязка формы к коду | Поле `slug` у формы (добавляем через `formOverrides`); код ссылается на `contact-us` |
| Сабмит | Штатный эндпоинт плагина `POST /api/form-submissions`; заявки видны в админке |
| Кол-во форм v1 | Одна (`contact-us`) для всех кнопок; проп `form` у триггера — заложено, не делаем |
| Локализация | Структура полей общая на все локали; `localized: true` только на подписях (`label`, `placeholder`, подписи опций select) через мерж экспортированных блоков плагина, плюс `submitButtonLabel` и `confirmationMessage`; редактор переключает Locale в админке, fallback en |
| Типы полей v1 | Только text, email, textarea, select, checkbox — остальные выключены в конфиге плагина, чтобы редактор не создал поле, которое фронт не отрендерит |
| Email-уведомления, капча | Вне скоупа v1; добавляются позже без перестройки (email-адаптер + Turnstile) |

## 1. Payload

### Конфиг плагина (`src/plugins/index.ts`)

- `fields`: whitelist типов (text, email, textarea, select, checkbox; остальные `false`). Каждый включённый тип — не `true`, а **трансформированный блок из официального экспорта плагина** (`import { fields } from '@payloadcms/plugin-form-builder'`): рекурсивный маппер помечает `localized: true` только на человекочитаемых подполях — `label`, `placeholder` и подписях опций select (с заходом в row/collapsible-обёртки). Структура полей (имена, порядок, required) остаётся общей на все локали.
- `formOverrides.fields` — функция-маппер над `defaultFields`:
  - добавить `slug` (text, unique, index, required) — стабильный ключ для кода;
  - `submitButtonLabel` → `localized: true`;
  - `confirmationMessage` → `localized: true`.
- `formOverrides.hooks.afterChange` — ревалидация: формы встроены в статические страницы, поэтому `revalidatePath('/{locale}', 'layout')` для всех локалей (формы меняются редко, грубая инвалидация ок).

### Для редактора

- Структура формы одна на все языки автоматически: поле добавляется один раз, в другой локали переводится только подпись (Locale-переключатель в админке). Разъехаться структуры не могут by design.
- Форма для модалки — slug `contact-us`.

## 2. Фронтенд

### Фича `_features/forms` (новая)

- `api/forms.ts` — `fetchFormBySlug = cache(async (slug, locale) => ...)`: `payload.find` по slug с локалью, `overrideAccess: false`, возвращает форму или `null`.
- `ui/FormRenderer.tsx` (клиентский, тупой) — принимает документ формы пропом:
  - рендерит поля по `blockType` (text → Input, email → Input type=email, textarea → Textarea, select → Select, checkbox → Checkbox) с подписями/required из формы;
  - сабмит: `POST /api/form-submissions` с `{ form: id, submissionData: [{ field, value }] }`;
  - состояния: idle → sending → success (рендер `confirmationMessage` через RichText) / error (текст ошибки, возможность повторить);
  - не знает ни про модалку, ни про страницы — пригоден для инлайн-встраивания (контакт-страница, newsletter) без изменений.
- `index.ts` — публичный API: `fetchFormBySlug`, `FormRenderer`.

### Фича `_features/contact` (упрощается)

- Мок `api/contactRequests.ts` и захардкоженные поля удаляются.
- `ContactModalProvider` принимает проп `form` (документ формы); `ContactModalDialog` рендерит `FormRenderer`.
- `[locale]/layout.tsx` (сервер): `fetchFormBySlug('contact-us', locale)` → `<ContactModalProvider form={...}>`. Формы нет в CMS → триггеры остаются, модалка показывает заглушку «Форма недоступна» (сайт не падает).
- Заголовок и подзаголовок модалки остаются в messages (они принадлежат обёртке-модалке, а не форме); в messages также остаются системные тексты (aria «Закрыть», заглушка «Форма недоступна»). Подписи полей, кнопка и сообщение успеха — из CMS.

### Триггеры

Без изменений: `ContactModalTrigger` уже используется в hero, табах и CTA. Проп `form` у триггера — расширение на будущее, в v1 не делаем.

## 3. Сид

Расширить `scripts/enrich-home-content.ts`: create-if-missing формы `contact-us` (slug, поля Name/Surname/E-mail/Phone/Company — text/email, required; submitButtonLabel «Send»; confirmationMessage). Создаётся в локали en (структура + подписи), затем update в локали uk перезаписывает те же строки (id сохраняются) с переведёнными подписями. Существующая форма не трогается — правки редактора и заявки переживают повторные прогоны. Команда одна для локали и прода (`pnpm seed:home` / `seed-prod.local.sh`).

## 4. Ошибки и краевые случаи

- Форма не создана в CMS → модалка с заглушкой, ошибок нет.
- Эндпоинт вернул ошибку (валидация/сеть) → состояние error с возможностью повторить, данные полей не теряются.
- Поле неизвестного типа в данных (теоретически) → пропускается с предупреждением в консоль — но whitelist типов в конфиге делает это недостижимым через админку.
- Укр-локаль формы не заполнена → fallback en (глобальная настройка локализации).

## 5. Проверка

1. `generate:types`, tsc.
2. Сид → в админке Forms появляется `contact-us` с полями; в uk-локали — украинские подписи.
3. На сайте: клик по CTA → модалка с полями из CMS (en и uk версии).
4. Сабмит → запись в Form Submissions с введёнными значениями; на сайте — confirmationMessage.
5. Редактор меняет подпись поля в админке → после ревалидации на сайте новая подпись.
