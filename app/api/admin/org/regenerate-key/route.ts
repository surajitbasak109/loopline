import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminSession } from "@/lib/auth/session";
import { generatePublicApiKey } from "@/lib/auth/public-api-key";

// POST /api/admin/org/regenerate-key — rotates the org's publishable API key.
export const POST = withAdminSession(async (_req, { org }) => {
  const publicApiKey = generatePublicApiKey();

  await prisma.organization.update({
    where: { id: org.id },
    data: { publicApiKey },
  });

  return NextResponse.json({ publicApiKey });
});
