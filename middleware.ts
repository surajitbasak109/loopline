export { auth as middleware } from "@/auth";

export const config = {
  // Protect all admin API routes and dashboard pages.
  // Public API routes and auth endpoints are intentionally excluded.
  matcher: ["/api/admin/:path*", "/dashboard/:path*"],
};
