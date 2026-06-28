import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Parse the URL manually so a special character like @ in the password
// doesn't confuse the adapter's internal `new URL()` call.
function parseDbUrl(url: string) {
  const withoutProtocol = url.replace(/^mysql:\/\//, "");
  const lastAt = withoutProtocol.lastIndexOf("@");
  const credentials = withoutProtocol.slice(0, lastAt);
  const hostAndDb = withoutProtocol.slice(lastAt + 1);
  const colonIdx = credentials.indexOf(":");
  const user = credentials.slice(0, colonIdx);
  const password = credentials.slice(colonIdx + 1);
  const [hostPort, database] = hostAndDb.split("/");
  const [host, portStr] = hostPort.split(":");
  return { host, port: portStr ? parseInt(portStr, 10) : 3306, user, password, database };
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaMariaDb(parseDbUrl(process.env.DATABASE_URL!)) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;