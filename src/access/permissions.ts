import type {
  Access,
  ClientUser,
  CollectionConfig,
  Field,
  FieldAccess,
  PayloadRequest,
} from 'payload'

// Single source of truth for the permission model. Every managed collection is
// listed here exactly once; the entry drives three things at once — the fields
// rendered on the user form, the access functions guarding the collection, and
// whether the collection shows up in the admin sidebar. Adding a collection to
// the model is a one-line change here.
//
// A new collection MUST be registered below and wired up with
// `collectionAccess` + `hiddenFor`. Skipping it does not leave the collection
// locked down — Payload's default lets any logged-in user create, update and
// delete everything in it. See the access checklist in CLAUDE.md.
//
// `publicRead` describes what an ANONYMOUS visitor gets, because the frontend
// reads most of these collections without a session:
//   open      → readable by anyone (unchanged public behaviour)
//   published → readable by anyone, filtered to published documents
//   none      → readable only with an explicit `read` permission
//
// The matrix layers admin visibility and draft access on top of that baseline:
// granting `read` means "sees the collection in the admin, and sees drafts".
export const MANAGED_COLLECTIONS = {
  posts: { label: 'Posts', publicRead: 'published' },
  news: { label: 'News', publicRead: 'published' },
  'case-studies': { label: 'Case Studies', publicRead: 'published' },
  documents: { label: 'Documents', publicRead: 'published' },
  journals: { label: 'Journals', publicRead: 'published' },
  'page-content': { label: 'Page Contents', publicRead: 'open' },
  media: { label: 'Media', publicRead: 'open' },
  categories: { label: 'Categories', publicRead: 'open' },
  tags: { label: 'Tags', publicRead: 'open' },
  authors: { label: 'Authors', publicRead: 'open' },
  forms: { label: 'Forms', publicRead: 'open' },
  'form-submissions': { label: 'Form Submissions', publicRead: 'none' },
  redirects: { label: 'Redirects', publicRead: 'open' },
} as const

// Globals carry a single permission — the right to edit them — so they are a
// flat list rather than a per-operation matrix: `read` is what the public site
// does on every page, and globals have no create or delete.
export const MANAGED_GLOBALS = {
  header: { label: 'Header', publicRead: 'open' },
  footer: { label: 'Footer', publicRead: 'open' },
} as const

export const OPERATIONS = ['read', 'create', 'update', 'delete'] as const

export type ManagedCollection = keyof typeof MANAGED_COLLECTIONS
export type ManagedGlobal = keyof typeof MANAGED_GLOBALS
export type Operation = (typeof OPERATIONS)[number]
type PublicRead = (typeof MANAGED_COLLECTIONS)[ManagedCollection]['publicRead']

// Structural type instead of the generated `User`: the permission helpers run
// against `req.user` (server) and `ClientUser` (admin sidebar), which are two
// different types carrying the same two fields.
type PermissionHolder = {
  fullAdmin?: boolean | null
  globals?: ManagedGlobal[] | null
  permissions?: Partial<Record<ManagedCollection, Operation[] | null>> | null
}

const MANAGED_COLLECTION_SLUGS = Object.keys(MANAGED_COLLECTIONS) as ManagedCollection[]

const asHolder = (user: unknown): PermissionHolder | null => (user as PermissionHolder) || null

export const isFullAdmin = (user?: PermissionHolder | null): boolean => {
  if (!user) return false

  return Boolean(user.fullAdmin)
}

const grantedOperations = (
  user: PermissionHolder | null,
  collection: ManagedCollection,
): Operation[] => {
  if (!user || !user.permissions) return []

  const granted = user.permissions[collection]
  if (!granted) return []

  return granted
}

export const hasPermission = (
  user: PermissionHolder | null,
  collection: ManagedCollection,
  operation: Operation,
): boolean => {
  if (isFullAdmin(user)) return true

  return grantedOperations(user, collection).includes(operation)
}

const hasAnyPermission = (user: PermissionHolder | null, collection: ManagedCollection): boolean => {
  if (isFullAdmin(user)) return true

  return grantedOperations(user, collection).length > 0
}

const can =
  (collection: ManagedCollection, operation: Operation): Access =>
  ({ req: { user } }) =>
    hasPermission(asHolder(user), collection, operation)

// Anonymous visitors and permission-less users see published documents only;
// a `read` permission additionally unlocks drafts in the admin.
const publishedOrPermitted =
  (collection: ManagedCollection): Access =>
  ({ req: { user } }) => {
    if (hasPermission(asHolder(user), collection, 'read')) return true

    return { _status: { equals: 'published' } }
  }

const openRead: Access = () => true

const PUBLIC_READ_STRATEGIES: Record<PublicRead, (collection: ManagedCollection) => Access> = {
  open: () => openRead,
  published: publishedOrPermitted,
  none: (collection) => can(collection, 'read'),
}

const buildReadAccess = (collection: ManagedCollection): Access => {
  const { publicRead } = MANAGED_COLLECTIONS[collection]

  return PUBLIC_READ_STRATEGIES[publicRead](collection)
}

export const collectionAccess = (collection: ManagedCollection): CollectionConfig['access'] => ({
  create: can(collection, 'create'),
  delete: can(collection, 'delete'),
  read: buildReadAccess(collection),
  update: can(collection, 'update'),
})

// Hiding is deliberately separate from denying: without it a user sees every
// collection in the sidebar and only discovers the denial by clicking into a 403.
export const hiddenFor =
  (collection: ManagedCollection) =>
  ({ user }: { user: ClientUser }): boolean =>
    !hasAnyPermission(asHolder(user), collection)

export const fullAdminOnly: Access = ({ req: { user } }) => isFullAdmin(asHolder(user))

const mayEditGlobal = (user: PermissionHolder | null, global: ManagedGlobal): boolean => {
  if (isFullAdmin(user)) return true
  if (!user || !user.globals) return false

  return user.globals.includes(global)
}

const canEditGlobal =
  (global: ManagedGlobal): Access =>
  ({ req: { user } }) =>
    mayEditGlobal(asHolder(user), global)

const GLOBAL_READ_STRATEGIES: Record<PublicRead, (global: ManagedGlobal) => Access> = {
  open: () => openRead,
  published: () => openRead,
  none: canEditGlobal,
}

export const globalAccess = (global: ManagedGlobal) => ({
  read: GLOBAL_READ_STRATEGIES[MANAGED_GLOBALS[global].publicRead](global),
  update: canEditGlobal(global),
})

// Same rule as collections: a global left in the nav without the permission
// lets an editor open it, fill it in, and discover the denial only on save.
// Globals hand `hidden` the server-side user type, not `ClientUser`.
export const hiddenForGlobal =
  (global: ManagedGlobal) =>
  ({ user }: { user: PayloadRequest['user'] }): boolean =>
    !mayEditGlobal(asHolder(user), global)

export const fullAdminOnlyField: FieldAccess = ({ req: { user } }) => isFullAdmin(asHolder(user))

const isPermittedOn = (user: PermissionHolder | null) => (collection: ManagedCollection) =>
  hasAnyPermission(user, collection)

const mayEditAnyGlobal = (user: PermissionHolder | null): boolean => {
  if (!user || !user.globals) return false

  return user.globals.length > 0
}

// Nothing granted anywhere → refused at the door instead of landing on an
// admin panel with an empty sidebar. Someone trusted with the header and
// nothing else still belongs in. Typed narrower than `Access`: the `admin`
// operation accepts a boolean only, never a query constraint.
export const canEnterAdmin = ({ req: { user } }: { req: PayloadRequest }): boolean => {
  const holder = asHolder(user)
  if (!holder) return false
  if (isFullAdmin(holder)) return true
  if (mayEditAnyGlobal(holder)) return true

  return MANAGED_COLLECTION_SLUGS.some(isPermittedOn(holder))
}

const toPermissionField = ([slug, { label }]: [string, { label: string }]): Field => ({
  name: slug,
  type: 'select',
  hasMany: true,
  label,
  options: [...OPERATIONS],
})

// Generated from the config so a new collection cannot be added to the model
// without appearing on the user form.
export const buildPermissionFields = (): Field[] =>
  Object.entries(MANAGED_COLLECTIONS).map(toPermissionField)

const toGlobalOption = ([slug, { label }]: [string, { label: string }]) => ({
  label,
  value: slug,
})

// Globals get one flat checkbox list instead of the per-operation grid: editing
// is the only thing there is to grant. The field itself is declared on `Users`;
// only its options are generated here, so a new global shows up automatically.
export const buildGlobalOptions = () => Object.entries(MANAGED_GLOBALS).map(toGlobalOption)
