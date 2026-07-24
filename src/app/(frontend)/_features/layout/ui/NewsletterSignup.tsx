'use client'

import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { useTranslations } from 'next-intl'
import React from 'react'

import RichText from '@/components/RichText'
import type { Form } from '@/payload-types'
import { findEmailFieldName, useFormSubmission } from '@frontend/_features/forms/client'
import { Show } from '@frontend/_shared/ui/Show'

type NewsletterFormProps = {
  emailFieldName: string
  form: Form
  heading?: string | null
}

// Чистый view: вся логика сабмита живёт в useFormSubmission (фича forms),
// компонент только рендерит состояние.
const NewsletterForm: React.FC<NewsletterFormProps> = ({ emailFieldName, form, heading }) => {
  const t = useTranslations('Layout')
  const { state, submit } = useFormSubmission(form)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    void submit([{ field: emailFieldName, value: String(formData.get('email') || '') }])
  }

  const submitLabel = form.submitButtonLabel || t('newsletterSubmit')
  const buttonLabel = state === 'sending' ? t('newsletterSending') : submitLabel

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <Show when={!!heading}>
        <p className="max-w-sm text-sm font-semibold text-white">{heading}</p>
      </Show>

      <Show when={state === 'success' && !!form.confirmationMessage}>
        <div className="text-sm text-white">
          <RichText
            data={form.confirmationMessage as DefaultTypedEditorState}
            enableGutter={false}
            enableProse={false}
          />
        </div>
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

type NewsletterSignupProps = {
  form: Form | null
  heading?: string | null
}

// Guard-обёртка без хуков: форма без email-поля не может быть отправлена,
// поэтому блок не рендерим вовсе.
export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({ form, heading }) => {
  if (!form) return null

  const emailFieldName = findEmailFieldName(form)
  if (!emailFieldName) return null

  return <NewsletterForm emailFieldName={emailFieldName} form={form} heading={heading} />
}
