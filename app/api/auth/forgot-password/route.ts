import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateToken, resetPasswordEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return 200 — never reveal whether an email exists.
  if (!user) return NextResponse.json({ ok: true });

  const { plain, hashed } = generateToken();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashed, resetTokenExpiry: expiry },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset-password?token=${plain}`;
  const { subject, html } = resetPasswordEmail(resetUrl);
  await sendEmail({ to: email, subject, html });

  return NextResponse.json({ ok: true });
}
