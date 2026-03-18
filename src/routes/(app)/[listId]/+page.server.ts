import { getListsCollection, getTasksCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { error, redirect } from "@sveltejs/kit"
import { ObjectId } from "mongodb"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) throw redirect(302, "/auth/login")

  let listOid: ObjectId
  try {
    listOid = new ObjectId(params.listId)
  } catch {
    throw error(404, "List not found")
  }

  const listsCol = await getListsCollection()
  const list = await listsCol.findOne({ _id: listOid as any, userId: locals.user.id })
  if (!list) throw error(404, "List not found")

  const tasksCol = await getTasksCollection()
  const tasks = await tasksCol.find({ listId: params.listId, userId: locals.user.id, archivedAt: null }).sort({ order: 1 }).toArray()

  // Get all tags for autocomplete
  const allTagsResult = await tasksCol.distinct("tags", { userId: locals.user.id })

  return {
    list: serializeDoc(list),
    tasks: tasks.map(serializeDoc),
    allTags: allTagsResult as string[],
  }
}
