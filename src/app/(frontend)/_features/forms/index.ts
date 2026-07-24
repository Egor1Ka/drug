// Полный public API (для серверного кода). Клиентские компоненты
// импортируют из '@frontend/_features/forms/client', чтобы server-only
// fetchFormBySlug не попал в клиентский бандл.
export { fetchFormBySlug } from './api/forms'
export * from './client'
