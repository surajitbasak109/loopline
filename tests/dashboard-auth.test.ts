import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Mock @/auth at the top level so next-auth (which imports next/server without
// the .js extension) is never loaded by Vitest's ESM resolver.
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// These imports resolve after the mock is hoisted, so session.ts gets the
// mocked `auth` rather than the real next-auth one.
import { auth } from "@/auth";
import { withAdminSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { NextRequest, NextResponse } from "next/server";

const mockAuth = vi.mocked(auth);

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
});

// ─── Credentials authorize (lib/auth/authorize.ts) ───────────────────────────

describe("authorize", () => {
  it("returns user object for valid credentials", async () => {
    const hash = await bcrypt.hash("secret123", 10);
    await prisma.user.create({ data: { email: "alice@test.dev", passwordHash: hash } });

    const result = await authorize({ email: "alice@test.dev", password: "secret123" });
    expect(result).toMatchObject({ email: "alice@test.dev" });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("returns null for a wrong password", async () => {
    const hash = await bcrypt.hash("correct", 10);
    await prisma.user.create({ data: { email: "bob@test.dev", passwordHash: hash } });

    expect(await authorize({ email: "bob@test.dev", password: "wrong" })).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    expect(await authorize({ email: "nobody@test.dev", password: "any" })).toBeNull();
  });

  it("returns null for malformed input", async () => {
    expect(await authorize({ email: "not-an-email", password: "x" })).toBeNull();
    expect(await authorize({})).toBeNull();
  });
});

// ─── withAdminSession wrapper ─────────────────────────────────────────────────

describe("withAdminSession", () => {
  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null as never);

    const handler = vi.fn();
    const res = await withAdminSession(handler)(
      new NextRequest("http://t/api/admin/posts"),
      { params: Promise.resolve({}) },
    );

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when the user has no organization", async () => {
    const user = await prisma.user.create({
      data: { email: "noorg@test.dev", passwordHash: "x" },
    });
    mockAuth.mockResolvedValue({ user: { id: user.id, email: user.email } } as never);

    const handler = vi.fn();
    const res = await withAdminSession(handler)(
      new NextRequest("http://t/api/admin/posts"),
      { params: Promise.resolve({}) },
    );

    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler with org and userId when session is valid", async () => {
    const user = await prisma.user.create({
      data: { email: "owner@test.dev", passwordHash: "x" },
    });
    const org = await prisma.organization.create({
      data: { name: "Acme", slug: "acme", publicApiKey: "pk_acme", ownerId: user.id },
    });
    mockAuth.mockResolvedValue({ user: { id: user.id, email: user.email } } as never);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const res = await withAdminSession(handler)(
      new NextRequest("http://t/api/admin/posts"),
      { params: Promise.resolve({}) },
    );

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ org: expect.objectContaining({ id: org.id }), userId: user.id }),
      expect.anything(),
    );
  });
});
