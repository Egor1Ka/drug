import Link from 'next/link'
import { useTranslations } from 'next-intl'
import React from 'react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  const t = useTranslations('NotFound')

  return (
    <div className="container py-28">
      <div className="prose max-w-none">
        <h1 style={{ marginBottom: 0 }}>404</h1>
        <p className="mb-4">{t('message')}</p>
      </div>
      <Button asChild variant="default">
        <Link href="/">{t('goHome')}</Link>
      </Button>
    </div>
  )
}
