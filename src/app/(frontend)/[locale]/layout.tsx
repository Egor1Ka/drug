import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { Nunito } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { type TypedLocale } from 'payload'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { ContactModalProvider } from '@frontend/_features/contact'
import { fetchFormBySlug } from '@frontend/_features/forms'
import { SiteFooter, SiteHeader } from '@frontend/_features/layout'
import { routing, type AppLocale } from '@/i18n/routing'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import '../globals.css'
import { getServerSideURL } from '@/utilities/getURL'

// Brand font of drug-card.io; cyrillic subset covers the uk locale
const nunito = Nunito({ subsets: ['latin', 'cyrillic'], variable: '--font-nunito' })

type Args = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

const toLocaleParam = (locale: AppLocale) => ({ locale })

export function generateStaticParams() {
  return routing.locales.map(toLocaleParam)
}

export default async function LocaleLayout({ children, params }: Args) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)

  const { isEnabled } = await draftMode()
  const contactForm = await fetchFormBySlug('contact-us', locale as TypedLocale)

  return (
    <html
      className={cn(nunito.variable, GeistMono.variable)}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
      </head>
      <body>
        <NextIntlClientProvider>
          <Providers>
            <ContactModalProvider form={contactForm}>
              <AdminBar
                adminBarProps={{
                  preview: isEnabled,
                }}
              />

              <SiteHeader locale={locale} />
              {children}
              <SiteFooter locale={locale} />
            </ContactModalProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

// The whole icon set is generated from the brand flame by
// `pnpm generate:favicons`; declaring it here rather than as hand-written
// <link> tags lets Next emit the right markup and keeps one source of truth.
const icons: Metadata['icons'] = {
  apple: [{ sizes: '180x180', type: 'image/png', url: '/apple-touch-icon.png' }],
  icon: [
    { sizes: '16x16 32x32 48x48', url: '/favicon.ico' },
    { type: 'image/svg+xml', url: '/favicon.svg' },
    { sizes: '192x192', type: 'image/png', url: '/icon-192.png' },
    { sizes: '512x512', type: 'image/png', url: '/icon-512.png' },
  ],
}

export const metadata: Metadata = {
  icons,
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
  },
}
