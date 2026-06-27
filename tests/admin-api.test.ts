import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

// Keep next-auth out of Vitest's ESM resolver.
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { GET as adminGetPosts } from "@/app/api/admin/posts/route";
import { PATCH as adminPatchPost, DELETE as adminDeletePost } from "@/app/api/admin/posts/[id]/route";
import { GET as adminGetChangelog, POST as adminPostChangelog } from "@/app/api/admin/changelog/route";
import { PATCH as adminPatchChangelog, DELETE as adminDeleteChangelog } from "@/app/api/admin/changelog/[id]/route";
import { POST as adminPublishChangelog } from "@/app/api/admin/changelog/[id]/publish/route";
import { GET as publicGetPosts } from "@/app/api/public/posts/route";

const mockAuth = vi.mocked(auth);

let userId: string;
let orgId: string;

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  vi.resetAllMocks();

  await prisma.vote.deleteMany();
  await prisma.post.deleteMany();
  await prisma.changelogEntry.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({ data: { email: "admin@test.dev", passwordHash: "x" } });
  const org = await prisma.organization.create({
    data: { name: "Acme", slug: "acme", publicApiKey: "pk_acme", ownerId: user.id },
  });
  userId = user.id;
  orgId = org.id;

  // Default: authenticated session for this user.
  mockAuth.mockResolvedValue({ user: { id: userId, email: "admin@test.dev" } } as never);
});

function req(url: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

function ctx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

// ─── Admin posts ──────────────────────────────────────────────────────────────

describe("GET /api/admin/posts", () => {
  it("returns all posts for the org", async () => {
    await prisma.post.createMany({
      data: [
        { title: "A", organizationId: orgId },
        { title: "B", organizationId: orgId, status: "PLANNED" },
      ],
    });

    const res = await adminGetPosts(req("http://t/api/admin/posts"), ctx());
    const { posts } = await res.json();

    expect(res.status).toBe(200);
    expect(posts).toHaveLength(2);
  });

  it("filters by status", async () => {
    await prisma.post.createMany({
      data: [
        { title: "Open", organizationId: orgId, status: "OPEN" },
        { title: "Planned", organizationId: orgId, status: "PLANNED" },
      ],
    });

    const res = await adminGetPosts(req("http://t/api/admin/posts?status=PLANNED"), ctx());
    const { posts } = await res.json();

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Planned");
  });

  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await adminGetPosts(req("http://t/api/admin/posts"), ctx());
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/admin/posts/[id]", () => {
  it("updates the post status", async () => {
    const post = await prisma.post.create({ data: { title: "Idea", organizationId: orgId } });

    const res = await adminPatchPost(
      req(`http://t/api/admin/posts/${post.id}`, { method: "PATCH", body: { status: "PLANNED" } }),
      ctx({ id: post.id }),
    );
    const { post: updated } = await res.json();

    expect(res.status).toBe(200);
    expect(updated.status).toBe("PLANNED");
  });

  it("returns 422 for an invalid status", async () => {
    const post = await prisma.post.create({ data: { title: "Idea", organizationId: orgId } });

    const res = await adminPatchPost(
      req(`http://t/api/admin/posts/${post.id}`, { method: "PATCH", body: { status: "INVALID" } }),
      ctx({ id: post.id }),
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 for a post from another org", async () => {
    const other = await prisma.user.create({ data: { email: "other@test.dev", passwordHash: "x" } });
    const otherOrg = await prisma.organization.create({
      data: { name: "Other", slug: "other", publicApiKey: "pk_other", ownerId: other.id },
    });
    const post = await prisma.post.create({ data: { title: "Secret", organizationId: otherOrg.id } });

    const res = await adminPatchPost(
      req(`http://t/api/admin/posts/${post.id}`, { method: "PATCH", body: { status: "PLANNED" } }),
      ctx({ id: post.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/posts/[id]", () => {
  it("deletes the post and returns 204", async () => {
    const post = await prisma.post.create({ data: { title: "Idea", organizationId: orgId } });

    const res = await adminDeletePost(
      req(`http://t/api/admin/posts/${post.id}`, { method: "DELETE" }),
      ctx({ id: post.id }),
    );
    expect(res.status).toBe(204);

    const gone = await prisma.post.findUnique({ where: { id: post.id } });
    expect(gone).toBeNull();
  });

  it("returns 404 for a non-existent post", async () => {
    const res = await adminDeletePost(
      req("http://t/api/admin/posts/nonexistent", { method: "DELETE" }),
      ctx({ id: "nonexistent" }),
    );
    expect(res.status).toBe(404);
  });
});

// ─── Admin changelog ──────────────────────────────────────────────────────────

describe("GET /api/admin/changelog", () => {
  it("returns all entries including drafts", async () => {
    await prisma.changelogEntry.createMany({
      data: [
        { title: "v1", body: "b", slug: "v1", organizationId: orgId, publishedAt: new Date() },
        { title: "Draft", body: "b", slug: "draft", organizationId: orgId },
      ],
    });

    const res = await adminGetChangelog(req("http://t/api/admin/changelog"), ctx());
    const { entries } = await res.json();

    expect(res.status).toBe(200);
    expect(entries).toHaveLength(2);
  });
});

describe("POST /api/admin/changelog", () => {
  it("creates a draft when no publishedAt supplied", async () => {
    const res = await adminPostChangelog(
      req("http://t/api/admin/changelog", { method: "POST", body: { title: "v2", body: "Details", slug: "v2" } }),
      ctx(),
    );
    const { entry } = await res.json();

    expect(res.status).toBe(201);
    expect(entry.publishedAt).toBeNull();
  });

  it("returns 409 on duplicate slug", async () => {
    await prisma.changelogEntry.create({
      data: { title: "v1", body: "b", slug: "v1", organizationId: orgId },
    });

    const res = await adminPostChangelog(
      req("http://t/api/admin/changelog", { method: "POST", body: { title: "v1 again", body: "b", slug: "v1" } }),
      ctx(),
    );
    expect(res.status).toBe(409);
  });

  it("returns 422 for an invalid slug", async () => {
    const res = await adminPostChangelog(
      req("http://t/api/admin/changelog", { method: "POST", body: { title: "v1", body: "b", slug: "Has Spaces" } }),
      ctx(),
    );
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/admin/changelog/[id]", () => {
  it("updates the entry", async () => {
    const entry = await prisma.changelogEntry.create({
      data: { title: "Old", body: "b", slug: "old", organizationId: orgId },
    });

    const res = await adminPatchChangelog(
      req(`http://t/api/admin/changelog/${entry.id}`, { method: "PATCH", body: { title: "New" } }),
      ctx({ id: entry.id }),
    );
    const { entry: updated } = await res.json();

    expect(res.status).toBe(200);
    expect(updated.title ?? (await res.json()).entry?.title).toBeDefined();
  });

  it("returns 404 for another org's entry", async () => {
    const other = await prisma.user.create({ data: { email: "o2@test.dev", passwordHash: "x" } });
    const otherOrg = await prisma.organization.create({
      data: { name: "O2", slug: "o2", publicApiKey: "pk_o2", ownerId: other.id },
    });
    const entry = await prisma.changelogEntry.create({
      data: { title: "Secret", body: "b", slug: "secret", organizationId: otherOrg.id },
    });

    const res = await adminPatchChangelog(
      req(`http://t/api/admin/changelog/${entry.id}`, { method: "PATCH", body: { title: "Hacked" } }),
      ctx({ id: entry.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/changelog/[id]", () => {
  it("deletes the entry and returns 204", async () => {
    const entry = await prisma.changelogEntry.create({
      data: { title: "v1", body: "b", slug: "v1", organizationId: orgId },
    });

    const res = await adminDeleteChangelog(
      req(`http://t/api/admin/changelog/${entry.id}`, { method: "DELETE" }),
      ctx({ id: entry.id }),
    );
    expect(res.status).toBe(204);

    expect(await prisma.changelogEntry.findUnique({ where: { id: entry.id } })).toBeNull();
  });
});

describe("POST /api/admin/changelog/[id]/publish", () => {
  it("sets publishedAt on a draft", async () => {
    const entry = await prisma.changelogEntry.create({
      data: { title: "Draft", body: "b", slug: "draft", organizationId: orgId },
    });

    const res = await adminPublishChangelog(
      req(`http://t/api/admin/changelog/${entry.id}/publish`, { method: "POST" }),
      ctx({ id: entry.id }),
    );
    const { entry: published } = await res.json();

    expect(res.status).toBe(200);
    expect(published.publishedAt).not.toBeNull();
  });

  it("is idempotent — does not overwrite an existing publishedAt", async () => {
    const original = new Date("2025-01-01T00:00:00Z");
    const entry = await prisma.changelogEntry.create({
      data: { title: "v1", body: "b", slug: "v1", organizationId: orgId, publishedAt: original },
    });

    const res = await adminPublishChangelog(
      req(`http://t/api/admin/changelog/${entry.id}/publish`, { method: "POST" }),
      ctx({ id: entry.id }),
    );
    const { entry: published } = await res.json();

    expect(new Date(published.publishedAt).getTime()).toBe(original.getTime());
  });
});

// ─── Privilege escalation ─────────────────────────────────────────────────────

describe("privilege escalation — public pk_ key cannot reach admin routes", () => {
  const publicKeyReq = (url: string, method = "GET") =>
    new NextRequest(url, {
      method,
      headers: { authorization: "Bearer pk_acme" },
    });

  it("GET /api/admin/posts returns 401 with a public API key (no session)", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await adminGetPosts(publicKeyReq("http://t/api/admin/posts"), ctx());
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/changelog returns 401 with a public API key", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await adminPostChangelog(
      publicKeyReq("http://t/api/admin/changelog", "POST"),
      ctx(),
    );
    expect(res.status).toBe(401);
  });

  it("public GET /api/public/posts still works for the same org", async () => {
    await prisma.post.create({ data: { title: "Public idea", organizationId: orgId } });

    const res = await publicGetPosts(
      new NextRequest("http://t/api/public/posts", {
        headers: { authorization: "Bearer pk_acme" },
      }),
      ctx(),
    );
    expect(res.status).toBe(200);
  });
});
