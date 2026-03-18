import { getListsCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { error, json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "./$types"

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) throw error(401)
  let oid: ObjectId
  try {
    oid = new ObjectId(params.id)
  } catch {
    throw error(400)
  }

  const body = await request.json()
  const allowed = ["name", "color", "icon", "order", "archivedAt"]
  const updates: Record<string, any> = { updatedAt: new Date() }
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]

  const col = await getListsCollection()
  const result = await col.findOneAndUpdate(
    { _id: oid as any, userId: locals.user.id },
    { $set: updates },
    { returnDocument: "after" },
  )

  if (!result) throw error(404)
  return json(serializeDoc(result))
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401)
  let oid: ObjectId
  try {
    oid = new ObjectId(params.id)
  } catch {
    throw error(400)
  }

  const col = await getListsCollection()
  await col.deleteOne({ _id: oid as any, userId: locals.user.id })
  return json({ ok: true })
}
