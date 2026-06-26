import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPublicApiKey, handlePreflight } from "@/lib/auth/public-api-key";

// GET /api/public/posts — list this tenant's feedback, most-voted first.
export const GET = withPublicApiKey(async (_req, { org }) => {
  const posts = await prisma.post.findMany({
    where: { organizationId: org.id }, // scoped — never returns another tenant's data
    orderBy: { voteCount: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      voteCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ posts });
});

const createSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().max(2000).optional(),
  submitterEmail: z.string().email().optional(),
  // Note: there is deliberately NO organizationId field here. Even if a caller
  // sends one, Zod strips it, and the org below comes from the key alone.
});

// POST /api/public/posts — submit a new feedback item.
export const POST = withPublicApiKey(async (req, { org }) => {
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

  const post = await prisma.post.create({
    data: {
      ...parsed.data,
      organizationId: org.id, // hardcoded from the key — the tenant boundary
    },
    select: { id: true, title: true, status: true, voteCount: true },
  });

  return NextResponse.json({ post }, { status: 201 });
});

// Preflight for cross-origin browsers.
export const OPTIONS = handlePreflight;