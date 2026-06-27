import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { createRateLimiter, getIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/public/posts/route";
import { POST as VOTE } from "@/app/api/public/posts/[id]/vote/route";

// Each test gets its own limiter instance — no shared state between tests.

afterEach(() => {
  vi.useRealTimers();
});

// ─── Unit: rate limiter logic ────────────────────────────────────────────────

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const rl = createRateLimiter();
    const opts = { limit: 3, windowMs: 60_000 };

    expect(rl.check("key", opts)).toEqual({ allowed: true });
    expect(rl.check("key", opts)).toEqual({ allowed: true });
    expect(rl.check("key", opts)).toEqual({ allowed: true });
  });

  it("blocks the request that exceeds the limit", () => {
    const rl = createRateLimiter();
    const opts = { limit: 2, windowMs: 60_000 };

    rl.check("key", opts);
    rl.check("key", opts);
    const result = rl.check("key", opts);

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  });

  it("tracks different keys independently", () => {
    const rl = createRateLimiter();
    const opts = { limit: 1, windowMs: 60_000 };

    expect(rl.check("a", opts)).toEqual({ allowed: true });
    expect(rl.check("b", opts)).toEqual({ allowed: true }); // separate bucket
    expect(rl.check("a", opts).allowed).toBe(false);
    expect(rl.check("b", opts).allowed).toBe(false);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    const rl = createRateLimiter();
    const opts = { limit: 1, windowMs: 60_000 };

    rl.check("key", opts); // consumes the only slot
    expect(rl.check("key", opts).allowed).toBe(false);

    vi.advanceTimersByTime(60_001); // window has elapsed

    expect(rl.check("key", opts)).toEqual({ allowed: true });
  });

  it("returns a positive retryAfter in seconds", () => {
    vi.useFakeTimers();
    const rl = createRateLimiter();
    const opts = { limit: 1, windowMs: 30_000 };

    rl.check("key", opts);
    const result = rl.check("key", opts);

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfter).toBe(30); // 30 000 ms → 30 s
    }
  });
});

// ─── Unit: getIp ─────────────────────────────────────────────────────────────

describe("getIp", () => {
  it("reads the first address from x-forwarded-for", () => {
    const req = new Request("http://t/", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(getIp(req)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when no header is present", () => {
    expect(getIp(new Request("http://t/"))).toBe("unknown");
  });
});

// ─── Integration: IP rate limit via withPublicApiKey ─────────────────────────

describe("IP rate limiting on public POST routes", () => {
  const route = { params: Promise.resolve({}) };

  beforeEach(async () => {
    await prisma.vote.deleteMany();
    await prisma.post.deleteMany();
    await prisma.changelogEntry.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    const owner = await prisma.user.create({
      data: { email: "rl@test.dev", passwordHash: "x" },
    });
    await prisma.organization.create({
      data: { name: "rl", slug: "rl", publicApiKey: "pk_rl", ownerId: owner.id },
    });
  });

  function makePost(ip: string) {
    return new NextRequest("http://t/api/public/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer pk_rl",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ title: "Test post" }),
    });
  }

  it("returns 429 after exceeding 20 POST requests from the same IP", async () => {
    // Exhaust the 20-request window.
    for (let i = 0; i < 20; i++) {
      const res = await POST(makePost("5.5.5.5"), route);
      expect(res.status).toBe(201);
    }

    const blocked = await POST(makePost("5.5.5.5"), route);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not rate-limit GET requests", async () => {
    // Even after filling the POST bucket for this IP, GETs must still pass.
    for (let i = 0; i < 20; i++) {
      await POST(makePost("6.6.6.6"), route);
    }

    const getReq = new NextRequest("http://t/api/public/posts", {
      headers: { authorization: "Bearer pk_rl", "x-forwarded-for": "6.6.6.6" },
    });
    const res = await GET(getReq, route);
    expect(res.status).toBe(200);
  });

  it("keeps separate buckets per IP", async () => {
    for (let i = 0; i < 20; i++) {
      await POST(makePost("7.7.7.7"), route);
    }

    // A different IP is unaffected.
    const res = await POST(makePost("8.8.8.8"), route);
    expect(res.status).toBe(201);
  });
});

// ─── Integration: cookie rate limit on the vote route ────────────────────────

describe("cookie rate limiting on vote route", () => {
  let orgId: string;

  beforeEach(async () => {
    await prisma.vote.deleteMany();
    await prisma.post.deleteMany();
    await prisma.changelogEntry.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    const owner = await prisma.user.create({
      data: { email: "rl2@test.dev", passwordHash: "x" },
    });
    const org = await prisma.organization.create({
      data: { name: "rl2", slug: "rl2", publicApiKey: "pk_rl2", ownerId: owner.id },
    });
    orgId = org.id;

    // Create enough distinct posts so the DB dedup constraint doesn't
    // interfere before the rate limit is reached.
    await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        prisma.post.create({ data: { title: `Post ${i}`, organizationId: org.id } }),
      ),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 429 after 5 votes from the same voter cookie", async () => {
    const voterId = "test-voter-cookie";

    // Vote on 5 distinct posts to avoid DB dedup interference.
    const posts = await prisma.post.findMany({ where: { organizationId: orgId }, take: 6 });

    for (let i = 0; i < 5; i++) {
      const res = await VOTE(
        new NextRequest(`http://t/api/public/posts/${posts[i].id}/vote`, {
          method: "POST",
          headers: {
            authorization: "Bearer pk_rl2",
            cookie: `lp_voter=${voterId}`,
            "x-forwarded-for": `9.9.9.${i}`, // rotate IPs so IP limit doesn't trigger
          },
        }),
        { params: Promise.resolve({ id: posts[i].id }) },
      );
      expect(res.status).toBe(201);
    }

    // The 6th vote with the same cookie should be rate-limited.
    const blocked = await VOTE(
      new NextRequest(`http://t/api/public/posts/${posts[5].id}/vote`, {
        method: "POST",
        headers: {
          authorization: "Bearer pk_rl2",
          cookie: `lp_voter=${voterId}`,
          "x-forwarded-for": "9.9.9.99",
        },
      }),
      { params: Promise.resolve({ id: posts[5].id }) },
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
