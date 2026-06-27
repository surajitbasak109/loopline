import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdminSession } from "@/lib/auth/session";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  publishedAt: z.coerce.date().optional(),
});

// GET /api/admin/changelog — list all entries (drafts + published), newest first.
export const GET = withAdminSession(async (_req, { org }) => {
  const entries = await prisma.changelogEntry.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ entries });
});

// POST /api/admin/changelog — create a changelog entry (draft if no publishedAt).
export const POST = withAdminSession(async (req, { org }) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const entry = await prisma.changelogEntry.create({
      data: { ...parsed.data, organizationId: org.id },
      select: { id: true, title: true, slug: true, publishedAt: true },
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    throw e;
  }
});
