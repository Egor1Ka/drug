import type { TypedLocale } from 'payload'

import { getCachedGlobal } from '@/utilities/getGlobals'

// depth 1 resolves the reference-type links (pages/posts) nested inside the
// menu's link fields. The global_header cache tag is invalidated by revalidateHeader.
export const fetchHeaderData = (locale: TypedLocale) => getCachedGlobal('header', 1, locale)()
