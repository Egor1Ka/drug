'use client'

import React, { createContext, use, useCallback, useState } from 'react'

import type { Form } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import { ContactModalDialog } from './ContactModalDialog'

type ContactModalContextValue = {
  closeModal: () => void
  isOpen: boolean
  openModal: () => void
}

const ContactModalContext = createContext<ContactModalContextValue>({
  closeModal: () => null,
  isOpen: false,
  openModal: () => null,
})

export const useContactModal = () => use(ContactModalContext)

type ContactModalProviderProps = {
  children: React.ReactNode
  form: Form | null
}

export const ContactModalProvider: React.FC<ContactModalProviderProps> = ({ children, form }) => {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = useCallback(() => setIsOpen(true), [])
  const closeModal = useCallback(() => setIsOpen(false), [])

  return (
    <ContactModalContext value={{ closeModal, isOpen, openModal }}>
      {children}
      <Show when={isOpen}>
        <ContactModalDialog form={form} onClose={closeModal} />
      </Show>
    </ContactModalContext>
  )
}
