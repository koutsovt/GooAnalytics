import { logger } from "@/lib/logger";
import { getRedisConnection } from "@/lib/queue/connection";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the current window resets (use for the Retry-After header). */
  resetSeconds: number;
}

/**
 * Fixed-window rate limiter backed by the shared Redis connection.
 *
 * Fails OPEN: if Redis is unavailable we allow the request rather than lock
 * users out of the product. The limiter exists to curb abuse/cost spikes, not
 * to be a hard security control — authorization is enforced separately.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const redis = getRedisConnection();
    const redisKey = `ratelimit:${key}`;

    const count = await redis.incr(redisKey);

    // Always ensure the key has a TTL. Setting it only on count===1 risks a
    // permanent lockout if the process dies between incr and expire: the key
    // would then live forever with no TTL and the counter could never reset.
    // Re-applying expire whenever the TTL is missing self-heals that case.
    let ttl = await redis.ttl(redisKey);
    if (ttl < 0) {
      await redis.expire(redisKey, windowSeconds);
      ttl = windowSeconds;
    }

    return { ok: count <= limit, remaining: Math.max(0, limit - count), resetSeconds: ttl };
  } catch (error) {
    logger.error("Rate limit check failed; allowing request", error);
    return { ok: true, remaining: limit, resetSeconds: windowSeconds };
  }
}
