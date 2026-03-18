import { getListsCollection } from "$lib/server/collections"
import { serializeDoc } from "$lib/utils"
import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, "/auth/login")

  const col = await getListsCollection()
  const lists = await col.find({ userId: locals.user.id, archivedAt: null }).sort({ order: 1 }).toArray()

  return {
    user: {
      id: locals.user.id,
      email: locals.user.email,
      displayName: locals.user.displayName,
    },
    lists: lists.map(serializeDoc),
  }
}
