import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminSession } from "@/lib/auth/session";

// POST /api/admin/changelog/[id]/publish — publish a draft by setting publishedAt.
// Idempotent: publishing an already-published entry is a no-op.
export const POST = withAdminSession(async (_req, { org }, routeCtx) => {
  const { id } = await routeCtx.params;

  const existing = await prisma.changelogEntry.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true, publishedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const entry = await prisma.changelogEntry.update({
    where: { id },
    data: { publishedAt: existing.publishedAt ?? new Date() },
    select: { id: true, title: true, slug: true, publishedAt: true },
  });

  return NextResponse.json({ entry });
});
