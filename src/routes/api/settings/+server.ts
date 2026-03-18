import { getUserSettingsCollection } from "$lib/server/collections"
import { DEFAULT_STATUSES } from "$lib/types"
import { error, json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401)

  const col = await getUserSettingsCollection()
  let settings = await col.findOne({ userId: locals.user.id })

  if (!settings) {
    const doc = { userId: locals.user.id, statusConfig: DEFAULT_STATUSES }
    await col.insertOne(doc as any)
    return json(doc)
  }

  return json({ userId: settings.userId, statusConfig: settings.statusConfig })
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401)

  const body = await request.json()
  if (!Array.isArray(body.statusConfig)) throw error(400, "statusConfig required")

  const col = await getUserSettingsCollection()
  await col.updateOne(
    { userId: locals.user.id },
    { $set: { statusConfig: body.statusConfig } },
    { upsert: true },
  )

  return json({ statusConfig: body.statusConfig })
}
