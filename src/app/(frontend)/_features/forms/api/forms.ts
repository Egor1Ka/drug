import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'
import { unstable_cache } from 'next/cache'

// Isolated side effect: the actual DB read. overrideAccess:false keeps the
// public read-access check (forms are publicly readable), same as the REST API.
const findFormBySlug = async (slug: string, locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'forms',
    limit: 1,
    locale,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
}

// Named thunk factory (no inline lambda) closing over the query args.
const loadForm = (slug: string, locale: TypedLocale) => () => findFormBySlug(slug, locale)


// Forms are embedded in the statically-prerendered [locale] layout, so the
// fetch is tag-cached exactly like getCachedGlobal. One revalidateTag(
// `form_<slug>`) from the form's afterChange hook regenerates every locale of
// the prerender — the path-based revalidation this replaced never purged the
// dynamic-route prerender on Vercel. The cache key includes locale; the tag
// stays per-slug so a single revalidate covers all locales.
export const fetchFormBySlug = (slug: string, locale: TypedLocale) =>
  unstable_cache(loadForm(slug, locale), ['form', slug, locale], {
    tags: [`form_${slug}`],
  })()
