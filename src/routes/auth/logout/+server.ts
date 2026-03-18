import { getLucia } from "$lib/server/auth"
import { redirect } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ locals, cookies }) => {
  if (locals.session) {
    const lucia = await getLucia()
    await lucia.invalidateSession(locals.session.id)
    const blankCookie = lucia.createBlankSessionCookie()
    cookies.set(blankCookie.name, blankCookie.value, {
      path: ".",
      ...blankCookie.attributes,
    })
  }
  throw redirect(302, "/auth/login")
}
