/**
 * In-Memory Rate Limiting Utility
 *
 * Simple rate limiter using sliding window algorithm.
 * For production with multiple serverless instances, consider using Upstash Redis:
 * 1. Install: npm install @upstash/ratelimit @upstash/redis
 * 2. Create Upstash account and Redis database at https://upstash.com
 * 3. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * 4. Replace this implementation with @upstash/ratelimit
 *
 * Current implementation uses in-memory storage (per-instance in serverless).
 */

import { NextRequest } from 'next/server'

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number

  /**
   * Time window in seconds
   */
  window: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
  requests: number[] // Timestamps of requests for sliding window
}

// In-memory store (per-instance in serverless environments)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return
  }

  const keysToDelete: string[] = []
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => rateLimitStore.delete(key))
  lastCleanup = now
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  // Prefer user ID if available
  if (userId) {
    return `user:${userId}`
  }

  // Try to get IP from various headers (for proxy/load balancer scenarios)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown'

  return `ip:${ip}`
}

/**
 * Check if a request should be rate limited using sliding window algorithm
 *
 * @param identifier - Unique identifier for the client (IP or user ID)
 * @param config - Rate limit configuration
 * @returns Object with success status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  success: boolean
  limit: number
  remaining: number
  reset: number
} {
  cleanupExpiredEntries()

  const now = Date.now()
  const windowMs = config.window * 1000
  const windowStart = now - windowMs

  // Get or create entry
  let entry = rateLimitStore.get(identifier)

  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      requests: [],
    }
    rateLimitStore.set(identifier, entry)
  }

  // Remove requests outside the sliding window
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart)

  // Check if limit is exceeded
  if (entry.requests.length >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: Math.ceil((entry.requests[0] + windowMs) / 1000),
    }
  }

  // Add current request
  entry.requests.push(now)
  entry.count = entry.requests.length
  entry.resetTime = now + windowMs

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: Math.ceil(entry.resetTime / 1000),
  }
}

/**
 * Rate limit middleware for API routes
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @param userId - Optional user ID for authenticated requests
 * @returns Rate limit check result
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
  headers: Record<string, string>
}> {
  const identifier = getClientIdentifier(request, userId)
  const result = checkRateLimit(identifier, config)

  return {
    ...result,
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    },
  }
}

/**
 * Common rate limit configurations
 */
export const RateLimitPresets = {
  // Very strict - for authentication endpoints
  AUTH: { limit: 5, window: 60 }, // 5 requests per minute

  // Strict - for sensitive operations
  STRICT: { limit: 10, window: 60 }, // 10 requests per minute

  // Moderate - for general API endpoints
  MODERATE: { limit: 30, window: 60 }, // 30 requests per minute

  // Generous - for public read-only endpoints
  GENEROUS: { limit: 100, window: 60 }, // 100 requests per minute

  // Team join - prevent spam
  TEAM_JOIN: { limit: 3, window: 300 }, // 3 requests per 5 minutes

  // Database setup - prevent repeated attempts
  DATABASE_SETUP: { limit: 5, window: 3600 }, // 5 requests per hour

  // Scouting search - prevent FTC API abuse
  SCOUTING_SEARCH: { limit: 20, window: 60 }, // 20 requests per minute
} as const
