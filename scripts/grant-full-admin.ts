import config from '@payload-config'
import { getPayload } from 'payload'

// Bootstrap for databases that already had users before the permission model
// existed: those documents carry neither `fullAdmin` nor `permissions`, so
// deploying the access rules without running this leaves the project with zero
// admins and no way to appoint one.
//
// Runs through the Local API, which bypasses access control by default, so it
// works even when the admin panel is already locked.
//
// Run it BEFORE deploying the access rules: `fullAdmin` is an ordinary document
// field, so seeding it ahead of time means production is never left without an
// admin. The local .env points at a different database, so target the deployed
// one explicitly:
//
//   DATABASE_URL='<production connection string>' \
//     pnpm payload run scripts/grant-full-admin.ts you@example.com

const emailArgument = process.argv[2]

if (!emailArgument) {
  console.error('Usage: pnpm payload run scripts/grant-full-admin.ts <email>')
  process.exit(1)
}

const payload = await getPayload({ config })

const matches = await payload.find({
  collection: 'users',
  limit: 1,
  where: { email: { equals: emailArgument } },
})

const user = matches.docs[0]

if (!user) {
  payload.logger.error(`No user found with email "${emailArgument}"`)
  process.exit(1)
}

await payload.update({
  id: user.id,
  collection: 'users',
  data: { fullAdmin: true },
})

payload.logger.info(`Granted full admin to ${emailArgument}`)

process.exit(0)
