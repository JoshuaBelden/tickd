import { getListsCollection, getTagsCollection, getTasksCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { error, json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401)

  const q = url.searchParams.get("q")?.trim()
  if (!q) throw error(400, "q required")

  const listId = url.searchParams.get("listId") ?? null
  const archived = url.searchParams.get("archived") === "true"

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")

  // Find tag IDs whose names match the query
  const tagsCol = await getTagsCollection()
  const matchingTags = await tagsCol
    .find({ userId: locals.user.id, name: { $regex: regex } })
    .toArray()
  const matchingTagIds = matchingTags.map(t => t._id.toString())

  const filter: Record<string, any> = {
    userId: locals.user.id,
    archivedAt: archived ? { $ne: null } : null,
    $or: [
      { title: { $regex: regex } },
      ...(matchingTagIds.length > 0 ? [{ tags: { $in: matchingTagIds } }] : []),
    ],
  }
  if (listId) filter.listId = listId

  const col = await getTasksCollection()
  const tasks = await col.find(filter).sort({ updatedAt: -1 }).limit(20).toArray()

  // Fetch all user lists to join list metadata
  const listsCol = await getListsCollection()
  const lists = await listsCol.find({ userId: locals.user.id }).toArray()
  const listMap = new Map(lists.map(l => [l._id.toString(), l]))

  const results = tasks.map(task => {
    const serialized = serializeDoc(task)
    const list = listMap.get(task.listId)
    return {
      ...serialized,
      listName: list ? list.name : "Deleted list",
      listIcon: list ? list.icon : "🗑",
      listColor: list ? list.color : "#888888",
      listDeleted: !list,
    }
  })

  return json(results)
}
