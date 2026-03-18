import "lucia"

// Augment Lucia User interface to include custom attributes
declare module "lucia" {
  interface Register {
    DatabaseUserAttributes: {
      email: string
      displayName: string
    }
  }
  interface User {
    email: string
    displayName: string
  }
}

declare global {
  namespace App {
    interface Locals {
      user: import("lucia").User | null
      session: import("lucia").Session | null
    }
  }
}

export {}
