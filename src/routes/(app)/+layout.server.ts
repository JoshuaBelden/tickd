import { getListsCollection, getUserSettingsCollection } from "$lib/server/collections"
import { DEFAULT_STATUSES } from "$lib/types"
import { serializeDoc } from "$lib/utils"
import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, "/auth/login")

  const listsCol = await getListsCollection()
  const lists = await listsCol.find({ userId: locals.user.id, archivedAt: null }).sort({ order: 1 }).toArray()

  const settingsCol = await getUserSettingsCollection()
  let settings = await settingsCol.findOne({ userId: locals.user.id })
  if (!settings) {
    const doc = { userId: locals.user.id, statusConfig: DEFAULT_STATUSES }
    await settingsCol.insertOne(doc as any)
    settings = doc as any
  }

  return {
    user: {
      id: locals.user.id,
      email: locals.user.email,
      displayName: locals.user.displayName,
    },
    lists: lists.map(serializeDoc),
    statusConfig: settings!.statusConfig,
  }
}
