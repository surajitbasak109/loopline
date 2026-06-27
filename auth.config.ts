import type { NextAuthConfig } from "next-auth";

// Lightweight config for the Edge Runtime middleware.
// No Prisma, no bcrypt — just JWT verification and route authorization.
// The full config (auth.ts) adds the Credentials provider with DB access.
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/dashboard") || pathname.startsWith("/api/admin");
      if (isProtected) return isLoggedIn;
      return true;
    },
  },
};
