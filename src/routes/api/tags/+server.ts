import { getTagsCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 })

  const tagsCol = await getTagsCollection()
  const tags = await tagsCol.find({ userId: locals.user.id }).sort({ name: 1 }).toArray()

  return json(tags.map(serializeDoc))
}

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 })

  const { name, color } = await request.json()
  if (!name?.trim()) return json({ error: "Name is required" }, { status: 400 })

  const tagsCol = await getTagsCollection()

  const existing = await tagsCol.findOne({
    userId: locals.user.id,
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  })
  if (existing) return json(serializeDoc(existing), { status: 409 })

  const now = new Date()
  const tag = {
    _id: new ObjectId(),
    userId: locals.user.id,
    name: name.trim(),
    color: color ?? "#6366f1",
    createdAt: now,
    updatedAt: now,
  }

  await tagsCol.insertOne(tag as any)

  return json(serializeDoc(tag), { status: 201 })
}
