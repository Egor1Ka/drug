import type { Form } from '@/payload-types'

import type { SubmissionEntry } from '../api/submissions'

type FormFieldBlock = NonNullable<Form['fields']>[number]

const isEmailField = (field: FormFieldBlock) => field.blockType === 'email'

// Имя email-поля задаёт редактор в админке, поэтому берём его из формы,
// а не хардкодим — иначе сабмит уйдёт в несуществующее поле.
export const findEmailFieldName = (form: Form) => {
  const fields = form.fields || []
  const emailField = fields.find(isEmailField)

  if (!emailField) return null

  return emailField.name
}

const toSubmissionEntry = ([field, value]: [string, FormDataEntryValue]): SubmissionEntry => ({
  field,
  value: String(value),
})

export const buildSubmissionData = (formData: FormData) =>
  Array.from(formData.entries()).map(toSubmissionEntry)

// Редирект после сабмита происходит только когда редактор явно настроил его
// в админке (confirmationType = 'redirect' + заполненный url).
export const getConfirmationRedirectUrl = (form: Form) => {
  if (form.confirmationType !== 'redirect' || !form.redirect) return null

  return form.redirect.url
}
