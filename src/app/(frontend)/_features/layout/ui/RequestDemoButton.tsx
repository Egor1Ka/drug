'use client'

import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'
import { cn } from '@/utilities/ui'

type RequestDemoButtonProps = {
  className?: string
  label: string | null
}

export const RequestDemoButton: React.FC<RequestDemoButtonProps> = ({ className, label }) => {
  if (!label) return null

  return (
    <ContactModalTrigger
      className={cn(
        'cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90',
        className,
      )}
    >
      {label}
    </ContactModalTrigger>
  )
}
