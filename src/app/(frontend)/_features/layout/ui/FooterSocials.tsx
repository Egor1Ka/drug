import React from 'react'

import type { Footer } from '@/payload-types'

type SocialEntry = NonNullable<Footer['socials']>[number]
type Platform = SocialEntry['platform']

// Конфиг вместо switch: платформа → подпись и контур иконки.
const PLATFORMS: Partial<Record<Platform, { label: string; path: string }>> = {
  facebook: {
    label: 'Facebook',
    path: 'M13 22v-9h3l.5-4H13V6.5c0-1.1.3-1.8 1.9-1.8H17V1.1C16.6 1.1 15.4 1 14 1c-2.9 0-4.9 1.8-4.9 5.1V9H6v4h3.1v9H13z',
  },
  instagram: {
    label: 'Instagram',
    path: 'M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.9c-.1 3.2-1.6 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-3.3-.2-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.9s0-3.5.1-4.8C2.3 4 3.8 2.4 7.1 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 6.6a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm5-1.7a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z',
  },
  linkedin: {
    label: 'LinkedIn',
    path: 'M4.98 3.5a2.5 2.5 0 11-.01 5 2.5 2.5 0 01.01-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21.5 8.65 22 11 22 14.1V21h-4v-6.1c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V21h-4V9z',
  },
  telegram: {
    label: 'Telegram',
    path: 'M21.9 4.3L18.6 20c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13.6l-4.9-1.5c-1-.3-1.1-1 .2-1.5L20.5 3c.9-.3 1.7.2 1.4 1.3z',
  },
  x: {
    label: 'X',
    path: 'M18.2 2h3.3l-7.2 8.3L23 22h-6.7l-5.2-6.9L5.1 22H1.8l7.7-8.9L1.3 2H8l4.7 6.3L18.2 2zm-1.2 18h1.8L7.1 3.8H5.2L17 20z',
  },
  youtube: {
    label: 'YouTube',
    path: 'M23 12s0-3.6-.5-5.3a2.8 2.8 0 00-1.9-2C18.8 4.2 12 4.2 12 4.2s-6.8 0-8.6.5a2.8 2.8 0 00-1.9 2C1 8.4 1 12 1 12s0 3.6.5 5.3c.3 1 1 1.7 1.9 2 1.8.5 8.6.5 8.6.5s6.8 0 8.6-.5a2.8 2.8 0 001.9-2c.5-1.7.5-5.3.5-5.3zM9.8 15.4V8.6l5.7 3.4-5.7 3.4z',
  },
}

const isRenderable = (entry: SocialEntry) => !!entry.url && !!PLATFORMS[entry.platform]

export const FooterSocials: React.FC<{ socials: NonNullable<Footer['socials']> }> = ({
  socials,
}) => {
  const toSocialLink = (entry: SocialEntry, index: number) => {
    const platform = PLATFORMS[entry.platform]

    if (!platform) return null

    return (
      <a
        aria-label={platform.label}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        href={entry.url}
        key={entry.id || index}
        rel="noopener noreferrer"
        target="_blank"
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d={platform.path} />
        </svg>
      </a>
    )
  }

  return <div className="flex gap-3">{socials.filter(isRenderable).map(toSocialLink)}</div>
}
