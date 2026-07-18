import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'

export const fetchAllCategories = async (locale: TypedLocale) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'categories',
    limit: 100,
    locale,
    overrideAccess: false,
    pagination: false,
    sort: 'title',
  })

  return result.docs
}
