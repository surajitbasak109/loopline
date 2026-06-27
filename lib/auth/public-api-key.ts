import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type { Organization } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimiter, getIp } from "@/lib/rate-limit";

// 20 mutating requests per minute per IP across all public POST routes.
const IP_LIMIT = { limit: 20, windowMs: 60_000 };

const KEY_PREFIX = "pk_";

// CORS is wide open *on purpose* — the widget loads on any customer's domain.
// What keeps this safe is not the origin check (there isn't one) but the fact
// that the key resolves to exactly one tenant and grants only the handful of
// actions wired up under /api/public/*.
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

export type PublicApiContext = {
  // The resolved tenant. This is the ONLY org the wrapped handler may touch.
  org: Organization;
};

type RouteContext = { params: Promise<Record<string, string>> };

type PublicHandler = (
  req: NextRequest,
  ctx: PublicApiContext,
  routeCtx: RouteContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a public route handler. Rejects the request (401) unless it carries a
 * valid publishable key, then hands the resolved org to the handler. The
 * handler can therefore NEVER be tricked into operating on another tenant,
 * because it never reads an org id from the request — only from the key.
 */
export function withPublicApiKey(handler: PublicHandler) {
  return async (req: NextRequest, routeCtx: RouteContext): Promise<NextResponse> => {
    const key = extractKey(req);

    if (!key || !key.startsWith(KEY_PREFIX)) {
      return withCors(NextResponse.json({ error: "Missing or malformed API key" }, { status: 401 }));
    }

    // Rate-limit mutating requests by IP before hitting the database.
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") {
      const ip = getIp(req);
      const rl = rateLimiter.check(`ip:${ip}`, IP_LIMIT);
      if (!rl.allowed) {
        return withCors(
          NextResponse.json({ error: "Too many requests" }, {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfter) },
          }),
        );
      }
    }

    const org = await prisma.organization.findUnique({
      where: { publicApiKey: key },
    });

    if (!org) {
      return withCors(NextResponse.json({ error: "Invalid API key" }, { status: 401 }));
    }

    const res = await handler(req, { org }, routeCtx);
    return withCors(res);
  };
}

// Preflight handler — export this as `OPTIONS` from each public route.
export function handlePreflight() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export function generatePublicApiKey() {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

function extractKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return req.headers.get("x-api-key");
}

function withCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v);
  return res;
}