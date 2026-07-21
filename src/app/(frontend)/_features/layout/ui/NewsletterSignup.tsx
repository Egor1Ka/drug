'use client'

import { useTranslations } from 'next-intl'
import React, { useState } from 'react'

import type { Form } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

type FormFieldBlock = NonNullable<Form['fields']>[number]
type SubmissionState = 'idle' | 'sending' | 'success' | 'error'

const isEmailField = (field: FormFieldBlock) => field.blockType === 'email'

// Имя email-поля задаёт редактор в админке, поэтому берём его из формы,
// а не хардкодим — иначе сабмит уйдёт в несуществующее поле.
export const findEmailFieldName = (form: Form) => {
  const fields = form.fields || []
  const emailField = fields.find(isEmailField)

  if (!emailField) return null

  return emailField.name
}

type NewsletterSignupProps = {
  form: Form | null
  heading?: string | null
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({ form, heading }) => {
  const t = useTranslations('Layout')
  const [state, setState] = useState<SubmissionState>('idle')

  if (!form) return null

  const emailFieldName = findEmailFieldName(form)

  const submitEmail = async (email: string) => {
    setState('sending')

    try {
      const response = await fetch('/api/form-submissions', {
        body: JSON.stringify({
          form: form.id,
          submissionData: [{ field: emailFieldName, value: email }],
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      setState(response.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    void submitEmail(String(formData.get('email') || ''))
  }

  const submitLabel = form.submitButtonLabel || t('newsletterSubmit')
  const buttonLabel = state === 'sending' ? t('newsletterSending') : submitLabel

  // Форма без email-поля не может быть отправлена — блок не рендерим.
  if (!emailFieldName) return null

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <Show when={!!heading}>
        <p className="max-w-sm text-sm font-semibold text-white">{heading}</p>
      </Show>

      <Show when={state === 'success'}>
        <p className="text-sm text-white">{t('newsletterSuccess')}</p>
      </Show>

      <Show when={state !== 'success'}>
        <form className="flex w-full max-w-md flex-col gap-2" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              className="h-10 w-full rounded-full border border-white/20 bg-transparent px-4 text-sm text-white placeholder:text-white/50"
              name="email"
              placeholder={t('newsletterPlaceholder')}
              required
              type="email"
            />
            <button
              className="cursor-pointer whitespace-nowrap rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-default disabled:opacity-60"
              disabled={state === 'sending'}
              type="submit"
            >
              {buttonLabel}
            </button>
          </div>

          <Show when={state === 'error'}>
            <p className="text-sm text-red-400">{t('newsletterError')}</p>
          </Show>
        </form>
      </Show>
    </div>
  )
}
