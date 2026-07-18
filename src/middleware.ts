import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Everything except Payload admin, API routes, preview routes (/next/*),
  // Next internals and any path containing a file extension (sitemaps, favicon)
  matcher: '/((?!admin|api|next|_next|_vercel|.*\\..*).*)',
}
