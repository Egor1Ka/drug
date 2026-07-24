'use client'

import { useState } from 'react'

import type { Form } from '@/payload-types'

import { submitFormSubmission, type SubmissionEntry } from '../api/submissions'
import { getConfirmationRedirectUrl } from '../helpers/fields'

export type SubmissionState = 'idle' | 'sending' | 'success' | 'error'

// Side effect навигации изолирован в именованной функции.
const redirectTo = (url: string) => window.location.assign(url)

// Стейт-машина сабмита Payload-формы — единственный источник правды для
// FormRenderer, NewsletterSignup и любых будущих потребителей форм.
// Поведение после успеха диктует настройка формы в админке:
// redirect → переход по url, иначе → state 'success' (confirmationMessage).
export const useFormSubmission = (form: Form) => {
  const [state, setState] = useState<SubmissionState>('idle')

  const submit = async (submissionData: SubmissionEntry[]) => {
    setState('sending')

    try {
      const response = await submitFormSubmission(form.id, submissionData)

      if (!response.ok) return setState('error')

      const redirectUrl = getConfirmationRedirectUrl(form)
      if (redirectUrl) return redirectTo(redirectUrl)

      setState('success')
    } catch {
      setState('error')
    }
  }

  return { state, submit }
}
