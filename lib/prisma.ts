import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Parse the URL manually so a special character like @ in the password
// doesn't confuse the adapter's internal `new URL()` call.
// Also handles ?ssl=true / ?ssl-mode=REQUIRED for managed hosts like Aiven.
function parseDbUrl(url: string) {
  const [base, query] = url.split("?");
  const withoutProtocol = base.replace(/^mysql:\/\//, "");
  const lastAt = withoutProtocol.lastIndexOf("@");
  const credentials = withoutProtocol.slice(0, lastAt);
  const hostAndDb = withoutProtocol.slice(lastAt + 1);
  const colonIdx = credentials.indexOf(":");
  const user = credentials.slice(0, colonIdx);
  const password = credentials.slice(colonIdx + 1);
  const [hostPort, database] = hostAndDb.split("/");
  const [host, portStr] = hostPort.split(":");
  const params = query ? new URLSearchParams(query) : null;
  const ssl =
    params?.get("ssl") === "true" ||
    params?.get("ssl-mode") === "REQUIRED" ||
    params?.get("sslmode") === "require";
  return {
    host,
    port: portStr ? parseInt(portStr, 10) : 3306,
    user,
    password,
    database,
    connectTimeout: 10000,
    socketTimeout: 60000,
    ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaMariaDb(parseDbUrl(process.env.DATABASE_URL!)) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;