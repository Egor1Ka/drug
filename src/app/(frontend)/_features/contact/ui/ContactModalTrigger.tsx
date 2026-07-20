'use client'

import React from 'react'

import { useContactModal } from './ContactModalProvider'

type ContactModalTriggerProps = {
  children: React.ReactNode
  className?: string
}

export const ContactModalTrigger: React.FC<ContactModalTriggerProps> = ({
  children,
  className,
}) => {
  const { openModal } = useContactModal()

  return (
    <button className={className} onClick={openModal} type="button">
      {children}
    </button>
  )
}
