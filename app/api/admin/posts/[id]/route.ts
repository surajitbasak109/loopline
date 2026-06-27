import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminSession } from "@/lib/auth/session";
import { PostStatus } from "@prisma/client";

const patchSchema = z.object({
  status: z.nativeEnum(PostStatus),
});

// PATCH /api/admin/posts/[id] — update post status.
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
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 422 });
  }

  const existing = await prisma.post.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const post = await prisma.post.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, title: true, status: true },
  });

  return NextResponse.json({ post });
});

// DELETE /api/admin/posts/[id] — delete a post (votes cascade via FK).
export const DELETE = withAdminSession(async (_req, { org }, routeCtx) => {
  const { id } = await routeCtx.params;

  const existing = await prisma.post.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
});
