import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { type DataFromGlobalSlug, getPayload, type TypedLocale } from 'payload'
import { unstable_cache } from 'next/cache'

type Global = keyof Config['globals']

async function getGlobal<T extends Global>(
  slug: T,
  depth: number,
  locale: TypedLocale,
): Promise<DataFromGlobalSlug<T>> {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
    locale,
  })

  return global
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug.
 * Cache key includes the locale; the tag stays per-slug so one revalidateTag
 * invalidates every locale of that global.
 */
export const getCachedGlobal = <T extends Global>(slug: T, depth = 0, locale: TypedLocale) =>
  unstable_cache(async () => getGlobal<T>(slug, depth, locale), [slug, locale], {
    tags: [`global_${slug}`],
  })
