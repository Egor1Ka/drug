import type { TypedLocale } from 'payload'

import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

export async function Header({ locale }: { locale: TypedLocale }) {
  const headerData = await getCachedGlobal('header', 1, locale)()

  return <HeaderClient data={headerData} />
}
