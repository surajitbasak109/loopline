import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminSession } from "@/lib/auth/session";
import { PostStatus } from "@prisma/client";

const filterSchema = z.object({
  status: z.nativeEnum(PostStatus).optional(),
});

// GET /api/admin/posts — list all feedback posts for this org, newest first.
// Optionally filter by ?status=OPEN|PLANNED|IN_PROGRESS|DONE|DECLINED.
export const GET = withAdminSession(async (req, { org }) => {
  const { searchParams } = new URL(req.url);
  const parsed = filterSchema.safeParse({ status: searchParams.get("status") ?? undefined });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const posts = await prisma.post.findMany({
    where: {
      organizationId: org.id,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      voteCount: true,
      submitterEmail: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ posts });
});
