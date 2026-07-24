'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useEffect } from 'react'

import type { Form } from '@/payload-types'
import { FormRenderer } from '@frontend/_features/forms/client'

type ContactModalDialogProps = {
  form: Form | null
  onClose: () => void
}

export const ContactModalDialog: React.FC<ContactModalDialogProps> = ({ form, onClose }) => {
  const t = useTranslations('ContactModal')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const renderFormBody = () => {
    if (!form) return <p className="text-sm text-muted-foreground">{t('unavailable')}</p>

    return <FormRenderer errorMessage={t('error')} form={form} submittingLabel={t('sending')} />
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      <button
        aria-label={t('close')}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-background p-8 shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <button
          aria-label={t('close')}
          className="absolute top-4 right-4 cursor-pointer text-muted-foreground transition hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-semibold text-foreground">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>

        <div className="mt-6">{renderFormBody()}</div>
      </div>
    </div>
  )
}
