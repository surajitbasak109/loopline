import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPublicApiKey, handlePreflight } from "@/lib/auth/public-api-key";
import { rateLimiter } from "@/lib/rate-limit";

const VOTER_COOKIE = "lp_voter";
// 5 votes per hour per voter cookie — on top of the IP limit in withPublicApiKey.
const COOKIE_VOTE_LIMIT = { limit: 5, windowMs: 60 * 60_000 };

// POST /api/public/posts/[id]/vote — cast a vote on a feedback post.
// Voter identity comes from a long-lived httpOnly cookie set here on first vote.
// Dedup is enforced by the DB @@unique([postId, voterId]) constraint; the
// application layer just maps P2002 → 409 so the widget can handle it cleanly.
export const POST = withPublicApiKey(async (req, { org }, routeCtx) => {
  const { id } = await routeCtx.params;

  // Verify the post exists and belongs to this org before touching votes.
  // This is the IDOR guard: a key for org A cannot vote on org B's posts.
  const post = await prisma.post.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const existingVoterId = req.cookies.get(VOTER_COOKIE)?.value;
  const voterId = existingVoterId ?? randomBytes(16).toString("base64url");

  // Secondary rate limit: cap votes per voter cookie to slow persistent abusers
  // who rotate IPs but keep their cookie.
  if (existingVoterId) {
    const rl = rateLimiter.check(`vote-cookie:${existingVoterId}`, COOKIE_VOTE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      });
    }
  }

  try {
    await prisma.$transaction([
      prisma.vote.create({ data: { postId: id, voterId } }),
      prisma.post.update({ where: { id }, data: { voteCount: { increment: 1 } } }),
    ]);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }
    throw e;
  }

  const res = NextResponse.json({ voted: true }, { status: 201 });

  if (!existingVoterId) {
    res.cookies.set(VOTER_COOKIE, voterId, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return res;
});

export const OPTIONS = handlePreflight;
