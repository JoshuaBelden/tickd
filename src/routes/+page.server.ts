import { getListsCollection } from "$lib/server/collections"
import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, "/auth/login")

  const col = await getListsCollection()
  const first = await col.findOne({ userId: locals.user.id, archivedAt: null }, { sort: { order: 1 } })

  if (first) {
    throw redirect(302, `/${first._id.toString()}`)
  }

  throw redirect(302, "/welcome")
}
