/**
 * Rate limiter using Upstash Redis.
 *
 * Falls through (allows request) when Upstash env vars are missing,
 * so dev/preview environments aren't blocked.
 *
 * Provides:
 *  - checkRateLimit(): generic 10/10min sliding window (vehicle lookups)
 *  - checkOtpRateLimit(): granular per-key limits (OTP abuse prevention)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  redis = new Redis({ url, token })
  return redis
}

let ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit

  const r = getRedis()
  if (!r) return null

  ratelimit = new Ratelimit({
    redis: r,
    // 10 requests per 10-minute sliding window per key
    limiter: Ratelimit.slidingWindow(10, '600 s'),
    analytics: true,
    prefix: 'mcar:rl',
  })

  return ratelimit
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

/**
 * Check rate limit for a given identifier (e.g. IP address).
 * Returns { allowed: true } when Upstash is not configured.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const rl = getRatelimit()
  if (!rl) {
    return { allowed: true, remaining: 999, resetMs: 0 }
  }

  try {
    const { success, remaining, reset } = await rl.limit(identifier)
    return {
      allowed: success,
      remaining,
      resetMs: reset,
    }
  } catch (err) {
    console.error('[rateLimit] Upstash error:', err)
    // Fail open — don't block users if Redis is down
    return { allowed: true, remaining: 999, resetMs: 0 }
  }
}

// ── Granular OTP rate limiting ─────────────────────────────────────────────────

// Cache Ratelimit instances per (maxRequests, windowSeconds) pair
const otpLimiters = new Map<string, Ratelimit>()

/**
 * Granular rate limiter for OTP abuse prevention.
 * Supports configurable limits per key (e.g. per-phone or per-IP).
 *
 * @param key       Unique key (e.g. 'otp:phone:07123456789' or 'otp:ip:1.2.3.4')
 * @param max       Max requests in the window
 * @param windowSec Window size in seconds
 */
export async function checkOtpRateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<RateLimitResult> {
  const r = getRedis()
  if (!r) {
    return { allowed: true, remaining: 999, resetMs: 0 }
  }

  const cacheKey = `${max}:${windowSec}`
  let limiter = otpLimiters.get(cacheKey)

  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      analytics: true,
      prefix: 'mcar:otp',
    })
    otpLimiters.set(cacheKey, limiter)
  }

  try {
    const { success, remaining, reset } = await limiter.limit(key)
    return {
      allowed: success,
      remaining,
      resetMs: reset,
    }
  } catch (err) {
    console.error('[otpRateLimit] Upstash error:', err)
    // Fail open
    return { allowed: true, remaining: 999, resetMs: 0 }
  }
}
