import type { Form } from '@/payload-types'

export type SubmissionEntry = { field: string; value: string }

// Единственное место, знающее endpoint сабмита Form Builder.
// Сетевой side effect изолирован здесь — хук и компоненты остаются чистыми.
export const submitFormSubmission = (formId: Form['id'], submissionData: SubmissionEntry[]) =>
  fetch('/api/form-submissions', {
    body: JSON.stringify({ form: formId, submissionData }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
