import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Mock sendEmail to avoid SMTP dependency and generateToken for predictable
// values. hashToken is kept real so DB lookups in verify/reset routes work.
vi.mock("@/lib/email", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...real,
    sendEmail: vi.fn().mockResolvedValue(undefined),
    generateToken: vi.fn().mockReturnValue({
      plain: "test-plain-token",
      hashed: real.hashToken("test-plain-token"),
    }),
    resetPasswordEmail: vi.fn().mockReturnValue({ subject: "Reset", html: "<p>reset</p>" }),
    verifyEmailTemplate: vi.fn().mockReturnValue({ subject: "Verify", html: "<p>verify</p>" }),
  };
});

import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { GET as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as resendVerification } from "@/app/api/auth/resend-verification/route";
import { hashToken, sendEmail } from "@/lib/email";

const PLAIN_TOKEN = "test-plain-token";
const HASHED_TOKEN = hashToken(PLAIN_TOKEN);

function jsonReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await prisma.vote.deleteMany();
  await prisma.post.deleteMany();
  await prisma.changelogEntry.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
});

// ── Forgot password ───────────────────────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 for an unknown email — never reveals whether it exists", async () => {
    const res = await forgotPassword(
      jsonReq("http://t/api/auth/forgot-password", { email: "nobody@test.dev" }),
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("returns 200 and sends a reset email for a known email", async () => {
    await prisma.user.create({
      data: { email: "alice@test.dev", passwordHash: "x" },
    });

    const res = await forgotPassword(
      jsonReq("http://t/api/auth/forgot-password", { email: "alice@test.dev" }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
  });

  it("stores the SHA-256 hash of the token, not the plain token", async () => {
    await prisma.user.create({
      data: { email: "bob@test.dev", passwordHash: "x" },
    });

    await forgotPassword(
      jsonReq("http://t/api/auth/forgot-password", { email: "bob@test.dev" }),
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "bob@test.dev" } });
    expect(user.resetToken).toBe(HASHED_TOKEN);
    expect(user.resetToken).not.toBe(PLAIN_TOKEN);
    expect(user.resetTokenExpiry).not.toBeNull();
  });

  it("returns 422 for an invalid email format", async () => {
    const res = await forgotPassword(
      jsonReq("http://t/api/auth/forgot-password", { email: "not-an-email" }),
    );
    expect(res.status).toBe(422);
  });
});

// ── Reset password ────────────────────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  async function seedWithResetToken(expiry: Date) {
    return prisma.user.create({
      data: {
        email: "reset@test.dev",
        passwordHash: await bcrypt.hash("old-password", 10),
        resetToken: HASHED_TOKEN,
        resetTokenExpiry: expiry,
      },
    });
  }

  it("updates the password and clears the token on a valid request", async () => {
    await seedWithResetToken(new Date(Date.now() + 60_000));

    const res = await resetPassword(
      jsonReq("http://t/api/auth/reset-password", {
        token: PLAIN_TOKEN,
        password: "new-password-123",
      }),
    );

    expect(res.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "reset@test.dev" } });
    expect(user.resetToken).toBeNull();
    expect(user.resetTokenExpiry).toBeNull();
    expect(await bcrypt.compare("new-password-123", user.passwordHash)).toBe(true);
    expect(await bcrypt.compare("old-password", user.passwordHash)).toBe(false);
  });

  it("returns 400 for an expired token", async () => {
    await seedWithResetToken(new Date(Date.now() - 1)); // already expired

    const res = await resetPassword(
      jsonReq("http://t/api/auth/reset-password", {
        token: PLAIN_TOKEN,
        password: "new-password-123",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid/unknown token", async () => {
    const res = await resetPassword(
      jsonReq("http://t/api/auth/reset-password", {
        token: "wrong-token",
        password: "new-password-123",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 422 when the new password is too short", async () => {
    const res = await resetPassword(
      jsonReq("http://t/api/auth/reset-password", {
        token: PLAIN_TOKEN,
        password: "short",
      }),
    );

    expect(res.status).toBe(422);
  });
});

// ── Verify email ──────────────────────────────────────────────────────────────

describe("GET /api/auth/verify-email", () => {
  function getReq(token?: string) {
    const url = token
      ? `http://t/api/auth/verify-email?token=${token}`
      : "http://t/api/auth/verify-email";
    return new NextRequest(url);
  }

  it("sets emailVerified and clears the token on a valid token", async () => {
    await prisma.user.create({
      data: { email: "verify@test.dev", passwordHash: "x", verifyToken: HASHED_TOKEN },
    });

    const res = await verifyEmail(getReq(PLAIN_TOKEN));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("success=true");

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "verify@test.dev" } });
    expect(user.emailVerified).not.toBeNull();
    expect(user.verifyToken).toBeNull();
  });

  it("redirects with error=invalid for an unknown token", async () => {
    const res = await verifyEmail(getReq("wrong-token"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=invalid");
  });

  it("redirects with error=invalid when the email is already verified", async () => {
    await prisma.user.create({
      data: {
        email: "already@test.dev",
        passwordHash: "x",
        verifyToken: HASHED_TOKEN,
        emailVerified: new Date(),
      },
    });

    const res = await verifyEmail(getReq(PLAIN_TOKEN));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=invalid");
  });

  it("redirects with error=missing when no token is in the URL", async () => {
    const res = await verifyEmail(getReq());

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=missing");
  });
});

// ── Resend verification ───────────────────────────────────────────────────────

describe("POST /api/auth/resend-verification", () => {
  it("returns 200 for unknown email — never reveals whether it exists", async () => {
    const res = await resendVerification(
      jsonReq("http://t/api/auth/resend-verification", { email: "nobody@test.dev" }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("sends a new verification email for an unverified user", async () => {
    await prisma.user.create({
      data: { email: "unverified@test.dev", passwordHash: "x" },
    });

    const res = await resendVerification(
      jsonReq("http://t/api/auth/resend-verification", { email: "unverified@test.dev" }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "unverified@test.dev" } });
    expect(user.verifyToken).toBe(HASHED_TOKEN);
  });

  it("returns 200 but does NOT send an email for an already-verified user", async () => {
    await prisma.user.create({
      data: { email: "verified@test.dev", passwordHash: "x", emailVerified: new Date() },
    });

    const res = await resendVerification(
      jsonReq("http://t/api/auth/resend-verification", { email: "verified@test.dev" }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });
});
