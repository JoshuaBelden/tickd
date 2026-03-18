import { getListsCollection, getTasksCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { error, json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401)
  const listId = url.searchParams.get("listId")
  if (!listId) throw error(400, "listId required")

  const col = await getTasksCollection()
  const tasks = await col.find({ listId, userId: locals.user.id, archivedAt: null }).sort({ order: 1 }).toArray()
  return json(tasks.map(serializeDoc))
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401)
  const body = await request.json()
  if (!body.title?.trim()) throw error(400, "Title required")
  if (!body.listId) throw error(400, "listId required")

  // Verify list belongs to user
  const listsCol = await getListsCollection()
  let listOid: ObjectId
  try {
    listOid = new ObjectId(body.listId)
  } catch {
    throw error(400)
  }
  const list = await listsCol.findOne({ _id: listOid as any, userId: locals.user.id })
  if (!list) throw error(404, "List not found")

  const col = await getTasksCollection()
  const count = await col.countDocuments({
    listId: body.listId,
    parentId: body.parentId ?? null,
    userId: locals.user.id,
  })

  const doc = {
    _id: new ObjectId() as any,
    userId: locals.user.id,
    listId: body.listId,
    parentId: body.parentId ?? null,
    title: body.title.trim(),
    description: null,
    status: body.status ?? list.statusConfig[0]?.id ?? "backlog",
    priority: body.priority ?? "none",
    dueDate: body.dueDate ?? null,
    tags: body.tags ?? [],
    checklist: [],
    checklists: [],
    order: count,
    nodePosition: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await col.insertOne(doc as any)
  return json(serializeDoc(doc))
}
