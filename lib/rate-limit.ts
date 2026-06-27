// Fixed-window in-memory rate limiter.
// Good enough for a single-process deployment; swap the store for Redis
// (e.g. @upstash/ratelimit) when running multiple instances.

type Window = { count: number; resetAt: number };

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number }; // retryAfter in seconds

export interface RateLimiter {
  check(key: string, opts: { limit: number; windowMs: number }): RateLimitResult;
}

export function createRateLimiter(): RateLimiter {
  const store = new Map<string, Window>();

  return {
    check(key, { limit, windowMs }) {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }

      if (entry.count >= limit) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      }

      entry.count++;
      return { allowed: true };
    },
  };
}

export const rateLimiter = createRateLimiter();

export function getIp(req: Request): string {
  const forwarded = (req.headers as Headers).get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() ?? "unknown";
}
