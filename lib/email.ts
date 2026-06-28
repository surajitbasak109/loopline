import nodemailer from "nodemailer";
import { Resend } from "resend";
import { createHash, randomBytes } from "crypto";

type EmailPayload = { to: string; subject: string; html: string };

async function sendViaResend({ to, subject, html }: EmailPayload) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.SMTP_FROM ?? "Loopline <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}

async function sendViaMailpit({ to, subject, html }: EmailPayload) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Loopline <noreply@loopline.app>",
    to,
    subject,
    html,
  });
}

export async function sendEmail(payload: EmailPayload) {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(payload);
  } else {
    await sendViaMailpit(payload);
  }
}

// ── Token helpers ─────────────────────────────────────────────────────────────

// Generates a secure random token and returns both the plain token (to send
// in the email) and its SHA-256 hash (to store in the database).
export function generateToken(): { plain: string; hashed: string } {
  const plain = randomBytes(32).toString("hex");
  const hashed = createHash("sha256").update(plain).digest("hex");
  return { plain, hashed };
}

export function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

// ── Email templates ───────────────────────────────────────────────────────────

export function resetPasswordEmail(resetUrl: string) {
  return {
    subject: "Reset your Loopline password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#6366f1;margin-bottom:8px">Loopline</h2>
        <p style="color:#374151;font-size:16px">You requested a password reset.</p>
        <p style="color:#6b7280;font-size:14px">
          Click the button below to set a new password. This link expires in
          <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#6366f1;color:#fff;font-weight:600;
                  border-radius:8px;text-decoration:none;font-size:14px">
          Reset password
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}

export function verifyEmailTemplate(verifyUrl: string) {
  return {
    subject: "Verify your Loopline email address",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#6366f1;margin-bottom:8px">Loopline</h2>
        <p style="color:#374151;font-size:16px">Welcome! Please verify your email address.</p>
        <p style="color:#6b7280;font-size:14px">
          Click the button below to confirm your account.
        </p>
        <a href="${verifyUrl}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#6366f1;color:#fff;font-weight:600;
                  border-radius:8px;text-decoration:none;font-size:14px">
          Verify email
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          If you didn't create a Loopline account, you can ignore this email.
        </p>
      </div>
    `,
  };
}
