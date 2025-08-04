import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

// Redis client singleton
const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL,
	token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Rate limiters - created once and reused
export const authLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(5, "5 m"), // 5 requests per 5 minutes
	analytics: true,
	prefix: "auth",
});

export const apiLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(100, "1 h"), // 100 requests per hour
	analytics: true,
	prefix: "api",
});

export const apiStrictLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(30, "1 h"), // 30 requests per hour for expensive ops
	analytics: true,
	prefix: "api-strict",
});

export const aiLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.tokenBucket(20, "1 h", 5), // 20 requests/hour with 5 burst
	analytics: true,
	prefix: "ai",
});

export const courseLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.fixedWindow(10, "1 h"), // 10 courses per hour
	analytics: true,
	prefix: "course",
});

// IP-based limiter for health checks
export const healthLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.fixedWindow(100, "1 h"), // 100 requests per hour per IP
	analytics: true,
	prefix: "health",
});

// Extract IP from request
export const extractIP = (request: NextRequest): string => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const realIP = request.headers.get("x-real-ip");
	const connectingIP = request.headers.get("cf-connecting-ip");

	if (forwardedFor) return forwardedFor.split(",")[0].trim();
	if (realIP) return realIP;
	if (connectingIP) return connectingIP;
	return "127.0.0.1";
};

// Simple rate limit check
export const checkRateLimit = async (
	limiter: Ratelimit,
	identifier: string,
	_action: string
) => {
	const result = await limiter.limit(identifier);
	return result;
};

// Convenience functions for common patterns
export const checkAuthRateLimit = (identifier: string) =>
	checkRateLimit(authLimiter, identifier.toLowerCase().trim(), "auth");

export const checkAPIRateLimit = (identifier: string) =>
	checkRateLimit(apiLimiter, identifier, "api");

export const checkAPIStrictRateLimit = (identifier: string) =>
	checkRateLimit(apiStrictLimiter, identifier, "api-strict");

export const checkAIRateLimit = (identifier: string) =>
	checkRateLimit(aiLimiter, identifier, "ai");

export const checkCourseRateLimit = (identifier: string) =>
	checkRateLimit(courseLimiter, identifier, "course");

export const checkHealthRateLimit = (ip: string) =>
	checkRateLimit(healthLimiter, ip, "health");

// Rate limit error interface
interface RateLimitError extends Error {
	remainingAttempts: number;
	resetTime?: number;
}

// Error handling
export const enforceRateLimit = async (
	rateLimitCheck: () => Promise<{
		success: boolean;
		remaining: number;
		reset?: number;
	}>,
	action: string
): Promise<void> => {
	const result = await rateLimitCheck();

	if (!result.success) {
		const error = new Error(
			`Rate limit exceeded for ${action}. Try again later.`
		) as RateLimitError;
		error.remainingAttempts = result.remaining;
		error.resetTime = result.reset;
		throw error;
	}
};
