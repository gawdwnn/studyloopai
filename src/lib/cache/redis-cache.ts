import { logger } from "@/lib/utils/logger";
import { Redis } from "@upstash/redis";

const CACHE_TTL_EMBEDDINGS = 7 * 24 * 60 * 60; // 7 days
const CACHE_PREFIX_EMBEDDINGS = "embeddings:";

const createRedisClient = () => {
	if (
		!process.env.UPSTASH_REDIS_REST_URL ||
		!process.env.UPSTASH_REDIS_REST_TOKEN
	) {
		console.warn(
			"Upstash Redis credentials not set. Redis caching will be disabled."
		);
		return null;
	}

	try {
		return Redis.fromEnv();
	} catch (error) {
		logger.error("Failed to create Redis client", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return null;
	}
};

const redisInstance = createRedisClient();

export class EmbeddingCache {
	private cache = redisInstance;

	private getCacheKey(textHash: string): string {
		return `${CACHE_PREFIX_EMBEDDINGS}${textHash}`;
	}

	async getBatchEmbeddings(
		textHashes: string[]
	): Promise<Map<string, number[]>> {
		const results = new Map<string, number[]>();
		if (textHashes.length === 0 || !this.cache) {
			return results;
		}

		try {
			const keys = textHashes.map(this.getCacheKey.bind(this));
			const cachedValues = await this.cache.mget(...keys);

			cachedValues.forEach((value, index) => {
				if (value === null) return;

				try {
					let embedding: number[];

					if (typeof value === "string") {
						embedding = JSON.parse(value) as number[];
					} else if (typeof value === "object" && Array.isArray(value)) {
						// Upstash may return parsed JSON when stored via REST API. Use as-is.
						embedding = value as unknown as number[];
					} else {
						throw new SyntaxError(
							`Unexpected cached value type: ${typeof value} for hash ${textHashes[index]}`
						);
					}

					results.set(textHashes[index], embedding);
				} catch (parseError) {
					logger.error(
						`Failed to parse cached embedding for hash ${textHashes[index]}`,
						{
							message:
								parseError instanceof Error
									? parseError.message
									: String(parseError),
							stack: parseError instanceof Error ? parseError.stack : undefined,
							hash: textHashes[index],
							valueType: typeof value,
						}
					);

					// Remove corrupted cache entry to avoid repeated failures
					if (this.cache) {
						this.cache.del(this.getCacheKey(textHashes[index])).catch(() => {});
					}
				}
			});
		} catch (error) {
			logger.error("Failed to get batch embeddings from cache", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				textHashesCount: textHashes.length,
			});
		}

		return results;
	}

	async setBatchEmbeddings(embeddings: Map<string, number[]>): Promise<void> {
		if (embeddings.size === 0 || !this.cache) {
			return;
		}

		try {
			const pipeline = this.cache.pipeline();
			for (const [hash, embedding] of embeddings.entries()) {
				const key = this.getCacheKey(hash);
				pipeline.setex(key, CACHE_TTL_EMBEDDINGS, JSON.stringify(embedding));
			}

			await pipeline.exec();
		} catch (error) {
			logger.error("Failed to set batch embeddings in cache", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				embeddingsCount: embeddings.size,
			});
		}
	}
}
