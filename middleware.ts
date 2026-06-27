import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use the lightweight edge-safe config — no Prisma, no bcrypt.
// The full auth.ts config (with Credentials + DB) is used in server components
// and API routes where Node.js APIs are available.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/api/admin/:path*", "/dashboard/:path*"],
};
