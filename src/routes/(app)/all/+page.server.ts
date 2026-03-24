import { getTasksCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, "/auth/login")

  const tasksCol = await getTasksCollection()
  const tasks = await tasksCol.find({ userId: locals.user.id, archivedAt: null }).sort({ order: 1 }).toArray()

  return {
    tasks: tasks.map(serializeDoc),
  }
}
