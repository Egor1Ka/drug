import type { TypedLocale } from 'payload'

import { getCachedGlobal } from '@/utilities/getGlobals'

// depth 1 resolves both the reference-type links in the columns and the
// newsletter.form relationship (the signup block needs the form's id and fields).
export const fetchFooterData = (locale: TypedLocale) => getCachedGlobal('footer', 1, locale)()
