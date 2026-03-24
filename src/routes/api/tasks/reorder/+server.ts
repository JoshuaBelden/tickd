import { getTasksCollection } from "$lib/server/collections"
import { error, json } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { RequestHandler } from "@sveltejs/kit"

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401)
  const body = await request.json()

  if (!Array.isArray(body.updates)) throw error(400, "updates array required")

  const col = await getTasksCollection()
  const ops = body.updates.map((u: { id: string; order: number; status?: string }) => {
    const set: Record<string, any> = { order: u.order, updatedAt: new Date() }
    if (u.status !== undefined) set.status = u.status
    return col.updateOne(
      { _id: new ObjectId(u.id) as any, userId: locals.user!.id },
      { $set: set },
    )
  })

  await Promise.all(ops)
  return json({ ok: true })
}
