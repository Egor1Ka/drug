'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useEffect } from 'react'

import type { Form } from '@/payload-types'
import { FormRenderer } from '@frontend/_features/forms/client'

import type { DocumentCardItem } from './DocumentCard'
import { resolveDocumentFileUrl } from '../lib/documentFile'

type DocumentGateDialogProps = {
  document: DocumentCardItem | null
  form: Form | null
  onClose: () => void
}

const DownloadLink: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <a
    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90"
    download
    href={href}
    rel="noopener"
    target="_blank"
  >
    {label}
  </a>
)

export const DocumentGateDialog: React.FC<DocumentGateDialogProps> = ({
  document,
  form,
  onClose,
}) => {
  const t = useTranslations('Documents')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  if (!document) return null

  const fileUrl = resolveDocumentFileUrl(document)

  const renderGateBody = () => {
    if (!form) return <p className="text-sm text-muted-foreground">{t('formUnavailable')}</p>

    return (
      <FormRenderer
        errorMessage={t('error')}
        extraSubmissionData={[{ field: 'document', value: document.title }]}
        form={form}
        submittingLabel={t('sending')}
        successSlot={fileUrl ? <DownloadLink href={fileUrl} label={t('download')} /> : null}
      />
    )
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

        <h2 className="text-2xl font-semibold text-foreground">{t('gateTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{document.title}</p>

        <div className="mt-6">{renderGateBody()}</div>
      </div>
    </div>
  )
}
