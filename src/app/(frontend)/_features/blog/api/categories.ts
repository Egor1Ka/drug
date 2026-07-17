import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const fetchAllCategories = async () => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'categories',
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: 'title',
  })

  return result.docs
}
