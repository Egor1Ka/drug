import config from '@payload-config'
import { getPayload } from 'payload'

// One-time migration after enabling localization: documents saved BEFORE
// localization store field values flat (title: "..."), while Payload now
// expects them keyed by locale (title: { en: "..." }). This wraps every
// pre-localization value into { en: value }. Idempotent: already-keyed
// values are skipped.

type MongoDocument = Record<string, unknown>

const LOCALE_KEYS = ['en', 'uk']

const COLLECTION_FIELDS: Record<string, string[]> = {
  categories: ['title'],
  pages: ['title', 'hero.richText', 'hero.links', 'layout', 'meta.title', 'meta.description'],
  posts: ['title', 'content', 'meta.title', 'meta.description'],
  tags: ['title'],
}

const GLOBAL_FIELDS: Record<string, string[]> = {
  footer: ['navItems'],
  header: ['navItems'],
}

const isLocaleKeyed = (value: unknown) =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  LOCALE_KEYS.some(hasLocaleKey(value as MongoDocument))

const hasLocaleKey = (value: MongoDocument) => (locale: string) => locale in value

const needsWrapping = (value: unknown) => value !== undefined && value !== null && !isLocaleKeyed(value)

const readSegment = (current: unknown, segment: string) =>
  current && typeof current === 'object' ? (current as MongoDocument)[segment] : undefined

const getByPath = (doc: MongoDocument, path: string) => path.split('.').reduce(readSegment, doc as unknown)

const buildSetOperations = (doc: MongoDocument, fieldPaths: string[]) => {
  const addOperation = (operations: MongoDocument, path: string) => {
    const value = getByPath(doc, path)
    if (!needsWrapping(value)) return operations
    return { ...operations, [path]: { en: value } }
  }

  return fieldPaths.reduce(addOperation, {})
}

const sum = (total: number, value: number) => total + value

const migrateLocalization = async () => {
  const payload = await getPayload({ config })
  const connection = payload.db.connection

  const migrateDocuments = async (
    collectionName: string,
    filter: MongoDocument,
    fieldPaths: string[],
    label: string,
  ) => {
    const collection = connection.collection(collectionName)
    const documents = await collection.find(filter).toArray()

    const updateDocument = async (doc: (typeof documents)[number]) => {
      const setOperations = buildSetOperations(doc as MongoDocument, fieldPaths)
      if (Object.keys(setOperations).length === 0) return 0
      await collection.updateOne({ _id: doc._id }, { $set: setOperations })
      return 1
    }

    const results = await Promise.all(documents.map(updateDocument))
    payload.logger.info(`${label}: migrated ${results.reduce(sum, 0)} of ${documents.length}`)
  }

  const migrateCollection = ([slug, fieldPaths]: [string, string[]]) =>
    migrateDocuments(slug, {}, fieldPaths, `collection "${slug}"`)

  const migrateGlobal = ([globalType, fieldPaths]: [string, string[]]) =>
    migrateDocuments('globals', { globalType }, fieldPaths, `global "${globalType}"`)

  await Promise.all(Object.entries(COLLECTION_FIELDS).map(migrateCollection))
  await Promise.all(Object.entries(GLOBAL_FIELDS).map(migrateGlobal))

  payload.logger.info('Localization migration finished')
}

await migrateLocalization()
process.exit(0)
