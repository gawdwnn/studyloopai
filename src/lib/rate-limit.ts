import { env } from "@/env";
import { logger } from "@/lib/utils/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_PREFIX = "rate_limit:";
const MAGIC_LINK_LIMIT = 3; // Maximum attempts
const MAGIC_LINK_WINDOW = "300 s"; // 5 minutes

let redisPromise: Promise<Redis | null> | null = null;

const createRedisClient = (): Promise<Redis | null> => {
	if (redisPromise) {
		return redisPromise;
	}

	redisPromise = (async () => {
		if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
			console.warn(
				"Upstash Redis credentials not set. Rate limiting will be disabled."
			);
			return null;
		}

		try {
			const redis = new Redis({
				url: env.UPSTASH_REDIS_REST_URL,
				token: env.UPSTASH_REDIS_REST_TOKEN,
			});
			return redis;
		} catch (error) {
			logger.error("Failed to create Redis client for rate limiting", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			return null;
		}
	})();

	return redisPromise;
};

// Cache to store Ratelimit instances
const ratelimiters = new Map<string, Ratelimit>();

type Duration = `${number} ${"d" | "h" | "m" | "s"}`;

async function getRateLimiter(
	limit: number,
	window: Duration,
	action: string
): Promise<Ratelimit | null> {
	const redis = await createRedisClient();
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
		const limiter = await getRateLimiter(limit, window, action);
		if (!limiter) {
			console.warn(
				`Rate limiting disabled for action '${action}': Redis not available`
			);
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
			logger.error(`Rate limit check failed for action '${action}'`, {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				action,
				identifier,
			});
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
		const redis = await createRedisClient();
		if (!redis) return;

		// The key is constructed based on the prefix defined in getRateLimiter
		const key = `${RATE_LIMIT_PREFIX}${action}:${identifier}`;
		try {
			await redis.del(key);
		} catch (error) {
			logger.error(`Failed to reset rate limit for key "${key}"`, {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				key,
				action,
				identifier,
			});
		}
	}
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limiting error class
 */
export const IS_RATE_LIMIT_ERROR = Symbol("IS_RATE_LIMIT_ERROR");
export class RateLimitError extends Error {
	public readonly [IS_RATE_LIMIT_ERROR] = true;
	constructor(
		message: string,
		public remainingAttempts: number,
		public resetTime?: number
	) {
		super(message);
		this.name = "RateLimitError";
	}
}
