import NextAuth, { DefaultSession } from "next-auth"
import { UserRole } from "@/lib/types"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      role: UserRole
      avatar?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: UserRole
    avatar?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    avatar?: string
  }
}