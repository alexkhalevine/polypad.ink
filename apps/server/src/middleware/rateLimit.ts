import rateLimit from "express-rate-limit";
import { env } from "process";

/**
 * Rate limiting configuration
 *
 * Environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 900000 = 15 min)
 * - RATE_LIMIT_MAX: Maximum requests per window per IP (default: 100)
 * - MCP_BEARER_TOKEN: When set, requests carrying a matching
 *   `Authorization: Bearer <token>` header bypass rate limiting. Used by the
 *   MCP server so AI-driven traffic isn't throttled like a single browser IP.
 */
const WINDOW_MS = parseInt(env.RATE_LIMIT_WINDOW_MS ?? "900000", 10);
const MAX_REQUESTS = parseInt(env.RATE_LIMIT_MAX ?? "100", 10);

export const rateLimitMiddleware = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for failed requests to avoid counting errors against limits
  skipFailedRequests: true,
  skip: (req) => {
    const token = process.env.MCP_BEARER_TOKEN;
    if (!token) return false;
    return req.header("authorization") === `Bearer ${token}`;
  },
  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests, please try again later.",
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
  },
});
