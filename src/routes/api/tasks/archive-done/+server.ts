import { getListsCollection, getTasksCollection } from "$lib/server/collections"
import { error, json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401)
  const body = await request.json()
  if (!body.listId) throw error(400, "listId required")

  let listOid: ObjectId
  try {
    listOid = new ObjectId(body.listId)
  } catch {
    throw error(400)
  }

  const listsCol = await getListsCollection()
  const list = await listsCol.findOne({ _id: listOid as any, userId: locals.user.id })
  if (!list) throw error(404, "List not found")

  const doneStatusIds = list.statusConfig.filter((s: any) => s.isDone).map((s: any) => s.id)
  if (doneStatusIds.length === 0) return json({ count: 0 })

  const col = await getTasksCollection()
  const result = await col.updateMany(
    { listId: body.listId, userId: locals.user.id, status: { $in: doneStatusIds }, archivedAt: null },
    { $set: { archivedAt: new Date().toISOString(), updatedAt: new Date() } },
  )

  return json({ count: result.modifiedCount })
}
