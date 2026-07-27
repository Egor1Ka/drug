'use client'

import { X } from 'lucide-react'
import React, { createContext, use, useCallback, useEffect, useState } from 'react'

import type { Form } from '@/payload-types'
import { FormRenderer } from '@frontend/_features/forms/client'

import { Show } from './Show'

// Anything a visitor may download after filling in a lead form. Deliberately
// thin: the gate has no idea whether it is handing over a whitepaper or a
// journal list, which is what lets two features share one implementation.
export type DownloadItem = {
  fileUrl: string | null
  title: string
}

// Labels arrive as props rather than through useTranslations: _shared holds
// primitives with no business meaning, so it must not know which translation
// namespace a consumer lives in.
export type DownloadGateLabels = {
  close: string
  download: string
  error: string
  formUnavailable: string
  gateTitle: string
  sending: string
}

type DownloadGateContextValue = {
  closeGate: () => void
  openGateFor: (item: DownloadItem) => void
}

const DownloadGateContext = createContext<DownloadGateContextValue>({
  closeGate: () => null,
  openGateFor: () => null,
})

export const useDownloadGate = () => use(DownloadGateContext)

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

type DownloadGateDialogProps = {
  form: Form | null
  item: DownloadItem
  labels: DownloadGateLabels
  onClose: () => void
}

const DownloadGateDialog: React.FC<DownloadGateDialogProps> = ({
  form,
  item,
  labels,
  onClose,
}) => {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const renderGateBody = () => {
    if (!form) return <p className="text-sm text-muted-foreground">{labels.formUnavailable}</p>

    return (
      <FormRenderer
        errorMessage={labels.error}
        // Which of the listing's items was requested. Domain-neutral name:
        // the same gate hands over whitepapers and journal lists alike.
        extraSubmissionData={[{ field: 'item', value: item.title }]}
        form={form}
        submittingLabel={labels.sending}
        successSlot={
          item.fileUrl ? <DownloadLink href={item.fileUrl} label={labels.download} /> : null
        }
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
        aria-label={labels.close}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-background p-8 shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <button
          aria-label={labels.close}
          className="absolute top-4 right-4 cursor-pointer text-muted-foreground transition hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-semibold text-foreground">{labels.gateTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{item.title}</p>

        <div className="mt-6">{renderGateBody()}</div>
      </div>
    </div>
  )
}

type DownloadGateProviderProps = {
  children: React.ReactNode
  form: Form | null
  labels: DownloadGateLabels
}

// Holds the item whose gate is open. One provider serves a whole listing, so
// every card shares a single dialog instance.
export const DownloadGateProvider: React.FC<DownloadGateProviderProps> = ({
  children,
  form,
  labels,
}) => {
  const [activeItem, setActiveItem] = useState<DownloadItem | null>(null)

  const openGateFor = useCallback((item: DownloadItem) => setActiveItem(item), [])
  const closeGate = useCallback(() => setActiveItem(null), [])

  return (
    <DownloadGateContext value={{ closeGate, openGateFor }}>
      {children}
      <Show when={activeItem}>
        {activeItem && (
          <DownloadGateDialog
            form={form}
            item={activeItem}
            labels={labels}
            onClose={closeGate}
          />
        )}
      </Show>
    </DownloadGateContext>
  )
}
