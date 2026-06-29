import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateToken, verifyEmailTemplate } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 422 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Always 200 — don't reveal whether the email exists.
  if (!user || user.emailVerified) return NextResponse.json({ ok: true });

  const { plain, hashed } = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken: hashed },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${plain}`;
  const { subject, html } = verifyEmailTemplate(verifyUrl);
  await sendEmail({ to: user.email, subject, html });

  return NextResponse.json({ ok: true });
}
