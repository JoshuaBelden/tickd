import { MongodbAdapter } from "@lucia-auth/adapter-mongodb"
import { Lucia } from "lucia"
import { getSessionsCollection, getUsersCollection } from "./collections"

// We need to create a lazy adapter since collections are async
let _lucia: Lucia | null = null

export async function getLucia(): Promise<Lucia> {
  if (_lucia) return _lucia

  const usersCol = await getUsersCollection()
  const sessionsCol = await getSessionsCollection()

  const adapter = new MongodbAdapter(sessionsCol as any, usersCol as any)

  _lucia = new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      },
    },
    getUserAttributes: attributes => {
      return {
        email: (attributes as any).email,
        displayName: (attributes as any).displayName,
      }
    },
  })

  return _lucia
}

declare module "lucia" {
  interface Register {
    Lucia: Lucia
    DatabaseUserAttributes: {
      email: string
      displayName: string
    }
  }
}
