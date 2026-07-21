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
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
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

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
