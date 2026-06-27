import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorize } from "@/lib/auth/authorize";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name?: string | null };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({ authorize }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
