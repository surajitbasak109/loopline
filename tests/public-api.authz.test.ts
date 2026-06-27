import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/public/posts/route";
import { POST as VOTE } from "@/app/api/public/posts/[id]/vote/route";

// These tests hit a real database so they prove the *queries* isolate tenants,
// not merely that we passed the right arguments to a mock.

const route = { params: Promise.resolve({}) };

function makeVoteCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedOrg(name: string, key: string) {
  const owner = await prisma.user.create({
    data: { email: `${name}@test.dev`, passwordHash: "x" },
  });
  return prisma.organization.create({
    data: { name, slug: name, publicApiKey: key, ownerId: owner.id },
  });
}

function makeReq(
  url: string,
  init: { key?: string; method?: string; body?: unknown; cookie?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.key) headers.set("authorization", `Bearer ${init.key}`);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

beforeEach(async () => {
  // Delete in FK-safe order.
  await prisma.vote.deleteMany();
  await prisma.post.deleteMany();
  await prisma.changelogEntry.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("public posts API — authentication", () => {
  it("rejects a request with no API key", async () => {
    const res = await GET(makeReq("http://t/api/public/posts"), route);
    expect(res.status).toBe(401);
  });

  it("rejects a request with an unknown API key", async () => {
    const res = await GET(makeReq("http://t/api/public/posts", { key: "pk_does_not_exist" }), route);
    expect(res.status).toBe(401);
  });
});

describe("public posts API — tenant isolation (IDOR)", () => {
  it("only returns posts belonging to the key's organization", async () => {
    const acme = await seedOrg("acme", "pk_acme");
    const globex = await seedOrg("globex", "pk_globex");

    await prisma.post.create({ data: { title: "Acme idea", organizationId: acme.id } });
    await prisma.post.create({ data: { title: "Globex secret", organizationId: globex.id } });

    const res = await GET(makeReq("http://t/api/public/posts", { key: "pk_acme" }), route);
    const { posts } = await res.json();

    expect(res.status).toBe(200);
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Acme idea");
  });

  it("ignores an attacker-supplied organizationId in the request body", async () => {
    const acme = await seedOrg("acme", "pk_acme");
    const globex = await seedOrg("globex", "pk_globex");

    // Attacker holds Acme's key but tries to plant a post inside Globex.
    const res = await POST(
      makeReq("http://t/api/public/posts", {
        method: "POST",
        key: "pk_acme",
        body: { title: "Injected post", organizationId: globex.id },
      }),
      route,
    );

    expect(res.status).toBe(201);

    const globexPosts = await prisma.post.findMany({ where: { organizationId: globex.id } });
    const acmePosts = await prisma.post.findMany({ where: { organizationId: acme.id } });

    expect(globexPosts).toHaveLength(0); // nothing crossed the tenant boundary
    expect(acmePosts).toHaveLength(1); // it landed in the key owner's org
  });
});

describe("vote deduplication (database constraint)", () => {
  it("rejects a second vote from the same voter on the same post", async () => {
    const acme = await seedOrg("acme", "pk_acme");
    const post = await prisma.post.create({ data: { title: "Idea", organizationId: acme.id } });

    await prisma.vote.create({ data: { postId: post.id, voterId: "voter-1" } });

    // The unique([postId, voterId]) constraint throws.
    await expect(
      prisma.vote.create({ data: { postId: post.id, voterId: "voter-1" } }),
    ).rejects.toThrow();

    // A different voter is unaffected.
    await expect(
      prisma.vote.create({ data: { postId: post.id, voterId: "voter-2" } }),
    ).resolves.toBeTruthy();
  });
});

describe("vote route", () => {
  it("casts a vote, increments voteCount, and sets the voter cookie", async () => {
    const acme = await seedOrg("acme", "pk_acme");
    const post = await prisma.post.create({ data: { title: "Idea", organizationId: acme.id } });

    const res = await VOTE(
      makeReq(`http://t/api/public/posts/${post.id}/vote`, { method: "POST", key: "pk_acme" }),
      makeVoteCtx(post.id),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ voted: true });

    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.voteCount).toBe(1);

    expect(res.cookies.get("lp_voter")).toBeDefined();
  });

  it("returns 409 when the same voter votes twice", async () => {
    const acme = await seedOrg("acme", "pk_acme");
    const post = await prisma.post.create({ data: { title: "Idea", organizationId: acme.id } });

    const first = await VOTE(
      makeReq(`http://t/api/public/posts/${post.id}/vote`, { method: "POST", key: "pk_acme" }),
      makeVoteCtx(post.id),
    );
    expect(first.status).toBe(201);
    const voterId = first.cookies.get("lp_voter")!.value;

    const second = await VOTE(
      makeReq(`http://t/api/public/posts/${post.id}/vote`, {
        method: "POST",
        key: "pk_acme",
        cookie: `lp_voter=${voterId}`,
      }),
      makeVoteCtx(post.id),
    );
    expect(second.status).toBe(409);

    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.voteCount).toBe(1); // count must not have incremented
  });

  it("returns 404 when voting on a post from another org (IDOR)", async () => {
    await seedOrg("acme", "pk_acme");
    const globex = await seedOrg("globex", "pk_globex");
    const globexPost = await prisma.post.create({ data: { title: "Globex idea", organizationId: globex.id } });

    // Acme's key tries to vote on Globex's post.
    const res = await VOTE(
      makeReq(`http://t/api/public/posts/${globexPost.id}/vote`, { method: "POST", key: "pk_acme" }),
      makeVoteCtx(globexPost.id),
    );

    expect(res.status).toBe(404);

    const votes = await prisma.vote.findMany({ where: { postId: globexPost.id } });
    expect(votes).toHaveLength(0); // no vote was cast
  });

  it("returns 404 for a non-existent post", async () => {
    await seedOrg("acme", "pk_acme");

    const res = await VOTE(
      makeReq("http://t/api/public/posts/nonexistent-id/vote", { method: "POST", key: "pk_acme" }),
      makeVoteCtx("nonexistent-id"),
    );

    expect(res.status).toBe(404);
  });
});
