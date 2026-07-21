import React from 'react'

import type { Footer } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import { SiteLogo } from './SiteLogo'

type Contacts = Footer['contacts']

export const FooterContacts: React.FC<{ contacts: Contacts }> = ({ contacts }) => {
  const address = contacts ? contacts.address : null
  const phone = contacts ? contacts.phone : null
  const email = contacts ? contacts.email : null
  const tagline = contacts ? contacts.tagline : null

  return (
    <div className="space-y-4">
      <SiteLogo variant="white" />

      <Show when={!!address}>
        <p className="max-w-xs whitespace-pre-line text-sm text-white/70">{address}</p>
      </Show>

      <Show when={!!phone}>
        <a className="block text-sm text-white/70 transition hover:text-white" href={`tel:${phone}`}>
          {phone}
        </a>
      </Show>

      <Show when={!!email}>
        <a
          className="block text-sm text-white/70 transition hover:text-white"
          href={`mailto:${email}`}
        >
          {email}
        </a>
      </Show>

      <Show when={!!tagline}>
        <p className="max-w-xs text-sm font-semibold text-white">{tagline}</p>
      </Show>
    </div>
  )
}
