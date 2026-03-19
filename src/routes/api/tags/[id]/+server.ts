import { getTagsCollection, getTasksCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "./$types"

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 })

  let tagOid: ObjectId
  try {
    tagOid = new ObjectId(params.id)
  } catch {
    return json({ error: "Invalid ID" }, { status: 400 })
  }

  const updates = await request.json()
  const allowed: Record<string, unknown> = {}
  if (updates.name !== undefined) allowed.name = updates.name.trim()
  if (updates.color !== undefined) allowed.color = updates.color
  allowed.updatedAt = new Date()

  const tagsCol = await getTagsCollection()
  const updated = await tagsCol.findOneAndUpdate(
    { _id: tagOid as any, userId: locals.user.id },
    { $set: allowed },
    { returnDocument: "after" }
  )

  if (!updated) return json({ error: "Not found" }, { status: 404 })

  return json(serializeDoc(updated))
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 })

  let tagOid: ObjectId
  try {
    tagOid = new ObjectId(params.id)
  } catch {
    return json({ error: "Invalid ID" }, { status: 400 })
  }

  const tagsCol = await getTagsCollection()
  const result = await tagsCol.deleteOne({ _id: tagOid as any, userId: locals.user.id })

  if (result.deletedCount === 0) return json({ error: "Not found" }, { status: 404 })

  // Remove the tag ID from all tasks
  const tasksCol = await getTasksCollection()
  await tasksCol.updateMany(
    { userId: locals.user.id, tags: params.id },
    { $pull: { tags: params.id } as any }
  )

  return json({ ok: true })
}
