import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import {
  buildGlobalOptions,
  buildPermissionFields,
  canEnterAdmin,
  fullAdminOnly,
  fullAdminOnlyField,
  isFullAdmin,
} from '../../access/permissions'

// Full admins manage everyone; everybody else is scoped to their own document,
// which is the minimum the admin panel needs to render the account page.
const fullAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isFullAdmin(user)) return true

  return { id: { equals: user.id } }
}

// Without this, a user with no privileges could open their own account page and
// tick `Full admin`. Field-level access is what actually blocks the write — the
// admin UI merely reflects it by rendering the field read-only.
const privilegedFieldAccess = { update: fullAdminOnlyField }

const isNotFullAdmin = (data?: { fullAdmin?: boolean | null } | null): boolean => {
  if (!data) return true

  return !data.fullAdmin
}

// A fresh environment starts with an empty users collection, so the very first
// account has to bootstrap itself — otherwise nobody could ever grant the first
// privilege. Existing databases are seeded with `scripts/grant-full-admin.ts`.
const grantFullAdminToFirstUser: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data

  const { totalDocs } = await req.payload.count({ collection: 'users' })
  if (totalDocs > 0) return data

  return { ...data, fullAdmin: true }
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: canEnterAdmin,
    create: fullAdminOnly,
    delete: fullAdminOnly,
    read: fullAdminOrSelf,
    unlock: fullAdminOnly,
    update: fullAdminOrSelf,
  },
  admin: {
    defaultColumns: ['name', 'email', 'fullAdmin'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'fullAdmin',
      type: 'checkbox',
      access: privilegedFieldAccess,
      admin: {
        description: 'Full access to every collection, every global and to user management.',
      },
      label: 'Full admin',
    },
    {
      name: 'permissions',
      type: 'group',
      access: privilegedFieldAccess,
      admin: {
        condition: isNotFullAdmin,
        description:
          'What this user may do in each collection. No operations selected means the collection is hidden from them entirely.',
      },
      fields: buildPermissionFields(),
    },
    {
      name: 'globals',
      type: 'select',
      access: privilegedFieldAccess,
      admin: {
        condition: isNotFullAdmin,
        description:
          'Site-wide settings this user may edit. These affect every page at once, so grant them deliberately.',
      },
      hasMany: true,
      label: 'Globals',
      options: buildGlobalOptions(),
    },
  ],
  hooks: {
    beforeChange: [grantFullAdminToFirstUser],
  },
  timestamps: true,
}
