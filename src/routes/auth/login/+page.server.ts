import { getLucia } from "$lib/server/auth"
import { getUsersCollection } from "$lib/server/collections"
import { fail, redirect } from "@sveltejs/kit"
import { Argon2id } from "oslo/password"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(302, "/")
}

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData()
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) return fail(400, { error: "Email and password required" })

    const usersCol = await getUsersCollection()
    const user = await usersCol.findOne({ email: email.toLowerCase() })

    if (!user) return fail(400, { error: "Invalid email or password" })

    const valid = await new Argon2id().verify(user.passwordHash as string, password)
    if (!valid) return fail(400, { error: "Invalid email or password" })

    const lucia = await getLucia()
    const session = await lucia.createSession(user._id.toString(), {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: ".",
      ...sessionCookie.attributes,
    })

    throw redirect(302, "/")
  },
}
