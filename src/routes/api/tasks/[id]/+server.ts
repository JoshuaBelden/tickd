import { getTasksCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { error, json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401)
  let oid: ObjectId
  try {
    oid = new ObjectId(params.id)
  } catch {
    throw error(400)
  }

  const col = await getTasksCollection()
  const task = await col.findOne({ _id: oid as any, userId: locals.user.id })
  if (!task) throw error(404)
  return json(serializeDoc(task))
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) throw error(401)
  let oid: ObjectId
  try {
    oid = new ObjectId(params.id)
  } catch {
    throw error(400)
  }

  const body = await request.json()
  const allowed = [
    "title",
    "description",
    "status",
    "priority",
    "dueDate",
    "tags",
    "checklist",
    "checklists",
    "order",
    "nodePosition",
    "listId",
    "parentId",
  ]
  const updates: Record<string, any> = { updatedAt: new Date() }
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]

  const col = await getTasksCollection()
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

  const col = await getTasksCollection()

  // Delete the task and all its subtasks recursively
  async function deleteRecursive(id: ObjectId) {
    const subtasks = await col.find({ parentId: id.toString(), userId: locals.user!.id }).toArray()
    for (const sub of subtasks) {
      await deleteRecursive(sub._id as any)
    }
    await col.deleteOne({ _id: id as any, userId: locals.user!.id })
  }

  await deleteRecursive(oid)
  return json({ ok: true })
}
