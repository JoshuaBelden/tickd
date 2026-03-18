import { getListsCollection } from "$lib/server/collections"
import { DEFAULT_STATUSES } from "$lib/types"
import { serializeDoc } from "$lib/utils"
import { error, json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) throw error(401)
  const col = await getListsCollection()
  const lists = await col.find({ userId: locals.user.id, archivedAt: null }).sort({ order: 1 }).toArray()
  return json(lists.map(serializeDoc))
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401)
  const body = await request.json()
  if (!body.name?.trim()) throw error(400, "Name required")

  const col = await getListsCollection()
  const count = await col.countDocuments({ userId: locals.user.id })

  const doc = {
    _id: new ObjectId() as any,
    userId: locals.user.id,
    name: body.name.trim(),
    color: body.color ?? "#6366f1",
    icon: body.icon ?? "📋",
    order: count,
    statusConfig: DEFAULT_STATUSES,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await col.insertOne(doc as any)
  return json(serializeDoc(doc))
}
