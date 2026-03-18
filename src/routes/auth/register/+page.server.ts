import { getLucia } from "$lib/server/auth"
import { getUsersCollection } from "$lib/server/collections"
import { fail, redirect } from "@sveltejs/kit"
import { generateId } from "lucia"
import { Argon2id } from "oslo/password"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(302, "/")
}

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData()
    const email = (formData.get("email") as string)?.toLowerCase()
    const password = formData.get("password") as string
    const displayName = formData.get("displayName") as string

    if (!email || !password || !displayName) return fail(400, { error: "All fields required" })
    if (password.length < 8) return fail(400, { error: "Password must be at least 8 characters" })

    const usersCol = await getUsersCollection()
    const existing = await usersCol.findOne({ email })
    if (existing) return fail(400, { error: "Email already in use" })

    const passwordHash = await new Argon2id().hash(password)
    const userId = generateId(15)

    await usersCol.insertOne({
      _id: userId as any,
      email,
      passwordHash,
      displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const lucia = await getLucia()
    const session = await lucia.createSession(userId, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: ".",
      ...sessionCookie.attributes,
    })

    // Create a default list for the new user
    const { getListsCollection } = await import("$lib/server/collections")
    const { DEFAULT_STATUSES } = await import("$lib/types")
    const { ObjectId } = await import("mongodb")
    const listsCol = await getListsCollection()
    await listsCol.insertOne({
      _id: new ObjectId() as any,
      userId,
      name: "General",
      color: "#6366f1",
      icon: "📋",
      order: 0,
      statusConfig: DEFAULT_STATUSES,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    throw redirect(302, "/")
  },
}
