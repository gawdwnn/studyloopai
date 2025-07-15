import { env } from "@/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_PREFIX = "rate_limit:";
const MAGIC_LINK_LIMIT = 3; // Maximum attempts
const MAGIC_LINK_WINDOW = "300 s"; // 5 minutes

const createRedisClient = () => {
	if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
		console.warn("Upstash Redis credentials not set. Rate limiting will be disabled.");
		return null;
	}

	try {
		return new Redis({
			url: env.UPSTASH_REDIS_REST_URL,
			token: env.UPSTASH_REDIS_REST_TOKEN,
		});
	} catch (error) {
		console.error("Failed to create Redis client for rate limiting:", error);
		return null;
	}
};

const redis = createRedisClient();

// Cache to store Ratelimit instances
const ratelimiters = new Map<string, Ratelimit>();

type Duration = `${number} ${"d" | "h" | "m" | "s"}`;

function getRateLimiter(limit: number, window: Duration, action: string): Ratelimit | null {
	if (!redis) {
		return null;
	}

	const key = `${action}:${limit}:${window}`;
	const cachedLimiter = ratelimiters.get(key);
	if (cachedLimiter) {
		return cachedLimiter;
	}

	const newLimiter = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(limit, window),
		prefix: `${RATE_LIMIT_PREFIX}${action}`,
	});

	ratelimiters.set(key, newLimiter);
	return newLimiter;
}

export class RateLimiter {
	/**
	 * Check if an action is rate limited for a given identifier
	 * @param identifier - Email address or IP address
	 * @param action - The action being performed (e.g., 'magic_link')
	 * @param limit - Maximum number of attempts allowed
	 * @param window - Time window (e.g., '300s')
	 * @returns Object with isAllowed boolean and remaining attempts
	 */
	async checkRateLimit(
		identifier: string,
		action: string,
		limit: number = MAGIC_LINK_LIMIT,
		window: Duration = MAGIC_LINK_WINDOW
	): Promise<{
		isAllowed: boolean;
		remainingAttempts: number;
		resetTime?: number;
	}> {
		const limiter = getRateLimiter(limit, window, action);
		if (!limiter) {
			console.warn(`Rate limiting disabled for action '${action}': Redis not available`);
			return { isAllowed: true, remainingAttempts: limit };
		}

		try {
			const { success, remaining, reset } = await limiter.limit(identifier);

			return {
				isAllowed: success,
				remainingAttempts: remaining,
				resetTime: reset,
			};
		} catch (error) {
			console.error(`Rate limit check failed for action '${action}':`, error);
			return { isAllowed: true, remainingAttempts: limit };
		}
	}

	/**
	 * Check rate limit specifically for magic link requests
	 */
	async checkMagicLinkRateLimit(email: string): Promise<{
		isAllowed: boolean;
		remainingAttempts: number;
		resetTime?: number;
	}> {
		return this.checkRateLimit(email.toLowerCase().trim(), "magic_link");
	}

	/**
	 * Reset rate limit for an identifier and action.
	 * NOTE: This should only be used in development/testing environments.
	 * @param identifier - The identifier to reset
	 * @param action - The action context for the rate limit
	 */
	async resetRateLimit(identifier: string, action: string): Promise<void> {
		if (!redis) return;

		// The key is constructed based on the prefix defined in getRateLimiter
		const key = `${RATE_LIMIT_PREFIX}${action}:${identifier}`;
		try {
			await redis.del(key);
		} catch (error) {
			console.error(`Failed to reset rate limit for key "${key}":`, error);
		}
	}
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limiting error class
 */
export class RateLimitError extends Error {
	constructor(
		message: string,
		public remainingAttempts: number,
		public resetTime?: number
	) {
		super(message);
		this.name = "RateLimitError";
	}
}
