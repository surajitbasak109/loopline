import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authorize(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
