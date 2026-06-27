import { NextRequest, NextResponse } from "next/server";
import type { Organization } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AdminContext = {
  org: Organization;
  userId: string;
};

type RouteContext = { params: Promise<Record<string, string>> };

type AdminHandler = (
  req: NextRequest,
  ctx: AdminContext,
  routeCtx: RouteContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an admin route handler. Rejects (401) if there is no valid session,
 * or (403) if the authenticated user has no organization. The org is resolved
 * from the session user id — never from request input — so IDOR is impossible
 * by the same mechanism as withPublicApiKey.
 */
export function withAdminSession(handler: AdminHandler) {
  return async (req: NextRequest, routeCtx: RouteContext): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await prisma.organization.findFirst({
      where: { ownerId: session.user.id },
    });

    if (!org) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    return handler(req, { org, userId: session.user.id }, routeCtx);
  };
}
