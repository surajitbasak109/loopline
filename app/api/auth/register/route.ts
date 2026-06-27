import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generatePublicApiKey } from "@/lib/auth/public-api-key";
import { registerSchema } from "@/lib/validations/register";
import { generateToken, sendEmail, verifyEmailTemplate } from "@/lib/email";

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 422 });
  }

  const { name, email, password, orgName, orgSlug } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const slugTaken = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (slugTaken) {
    return NextResponse.json({ error: "That organization slug is already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { plain, hashed } = generateToken();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      verifyToken: hashed,
      organizations: {
        create: {
          name: orgName,
          slug: orgSlug,
          publicApiKey: generatePublicApiKey(),
        },
      },
    },
  });

  // Send verification email — fire and forget, don't block the response.
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/verify-email?token=${plain}`;
  const { subject, html } = verifyEmailTemplate(verifyUrl);
  sendEmail({ to: user.email, subject, html }).catch(console.error);

  return NextResponse.json({ ok: true }, { status: 201 });
}
