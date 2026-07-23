import type { CollectionAfterReadHook } from 'payload'
import { Author } from 'src/payload-types'

// Denormalize each related author (id, name, slug) onto `populatedAuthors` so
// blog cards render the byline and link to /blog/author/[slug] without an extra
// relationship query per card. The `authors` collection is publicly readable,
// so this is a convenience denormalization rather than a privacy workaround.
const toAuthorId = (author: Author | string) =>
  typeof author === 'object' ? author?.id : author

const toPopulatedAuthor = (author: Author) => ({
  id: author.id,
  name: author.name,
  slug: author.slug,
})

const isAuthor = (author: Author | null): author is Author => Boolean(author)

export const populateAuthors: CollectionAfterReadHook = async ({ doc, req: { payload } }) => {
  if (!doc || !doc.authors || doc.authors.length === 0) return doc

  const fetchAuthor = async (author: Author | string): Promise<Author | null> => {
    try {
      return await payload.findByID({
        id: toAuthorId(author),
        collection: 'authors',
        depth: 0,
      })
    } catch {
      // A missing author must never break post reads.
      return null
    }
  }

  const authorDocs = await Promise.all(doc.authors.map(fetchAuthor))

  doc.populatedAuthors = authorDocs.filter(isAuthor).map(toPopulatedAuthor)

  return doc
}
