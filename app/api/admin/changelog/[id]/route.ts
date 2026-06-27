import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminSession } from "@/lib/auth/session";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

// PATCH /api/admin/changelog/[id] — update a changelog entry.
export const PATCH = withAdminSession(async (req, { org }, routeCtx) => {
  const { id } = await routeCtx.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.changelogEntry.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  try {
    const entry = await prisma.changelogEntry.update({
      where: { id },
      data: parsed.data,
      select: { id: true, title: true, slug: true, publishedAt: true },
    });
    return NextResponse.json({ entry });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    throw e;
  }
});

// DELETE /api/admin/changelog/[id] — delete a changelog entry.
export const DELETE = withAdminSession(async (_req, { org }, routeCtx) => {
  const { id } = await routeCtx.params;

  const existing = await prisma.changelogEntry.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await prisma.changelogEntry.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
});
