import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorize } from "@/lib/auth/authorize";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name?: string | null; emailVerified: Date | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({ authorize })],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.emailVerified = (user as { emailVerified?: string | null }).emailVerified ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      const ev = token.emailVerified as string | null | undefined;
      session.user.emailVerified = ev ? new Date(ev) : null;
      return session;
    },
  },
});
