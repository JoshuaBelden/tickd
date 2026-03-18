import { getUserSettingsCollection, getTasksCollection } from "$lib/server/collections"
import { DEFAULT_STATUSES } from "$lib/types"
import { error, json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401)

  const { statusId } = await request.json()
  if (!statusId) throw error(400, "statusId required")

  const settingsCol = await getUserSettingsCollection()
  const settings = await settingsCol.findOne({ userId: locals.user.id })
  const statusConfig = settings?.statusConfig ?? DEFAULT_STATUSES

  // Find the status to delete
  const statusIndex = statusConfig.findIndex(s => s.id === statusId)
  if (statusIndex === -1) throw error(404, "Status not found")

  // Cannot delete first (backlog) or last (done) status
  if (statusIndex === 0 || statusIndex === statusConfig.length - 1) {
    throw error(400, "Cannot delete the first or last status")
  }

  // Backlog is always the first status
  const backlogId = statusConfig[0].id

  // Migrate all tasks with the deleted status to backlog
  const tasksCol = await getTasksCollection()
  await tasksCol.updateMany(
    { userId: locals.user.id, status: statusId },
    { $set: { status: backlogId, updatedAt: new Date() } },
  )

  // Remove status and reassign order values
  const updated = statusConfig
    .filter(s => s.id !== statusId)
    .map((s, i) => ({ ...s, order: i }))

  await settingsCol.updateOne(
    { userId: locals.user.id },
    { $set: { statusConfig: updated } },
    { upsert: true },
  )

  return json({ statusConfig: updated })
}
