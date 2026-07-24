// Client-safe public API фичи: всё, кроме server-only fetchFormBySlug
// (payload + node:fs), который нельзя тянуть в клиентский бандл.
// Клиентские компоненты импортируют отсюда, серверные — из './index'.
export type { SubmissionEntry } from './api/submissions'
export { findEmailFieldName } from './helpers/fields'
export { useFormSubmission } from './hooks/useFormSubmission'
export type { SubmissionState } from './hooks/useFormSubmission'
export { FormRenderer } from './ui/FormRenderer'
