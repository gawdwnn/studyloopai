import { Redis } from "@upstash/redis";

const CACHE_TTL_EMBEDDINGS = 7 * 24 * 60 * 60; // 7 days
const CACHE_TTL_USER_AUTH = 15 * 60; // 15 minutes
const CACHE_PREFIX_EMBEDDINGS = "embeddings:";
const CACHE_PREFIX_USER_AUTH = "user_auth:";

const createRedisClient = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("Upstash Redis credentials not set. Redis caching will be disabled.");
    return null;
  }

  try {
    return Redis.fromEnv();
  } catch (error) {
    console.error("Failed to create Redis client:", error);
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
        if (value !== null) {
          try {
            const embedding = JSON.parse(value as string);
            results.set(textHashes[index], embedding);
          } catch (parseError) {
            console.error(
              `Failed to parse cached embedding for hash ${textHashes[index]}:`,
              parseError
            );
          }
        }
      });
    } catch (error) {
      console.error("Failed to get batch embeddings from cache:", error);
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
      console.error("Failed to set batch embeddings in cache:", error);
    }
  }
}

export interface UserAuthData {
  signup_step: number;
  cached_at: number;
}

export class UserAuthCache {
  private cache = redisInstance;

  private getCacheKey(userId: string): string {
    return `${CACHE_PREFIX_USER_AUTH}${userId}`;
  }

  async getUserAuthData(userId: string): Promise<UserAuthData | null> {
    if (!this.cache) {
      return null;
    }

    try {
      const cachedValue = await this.cache.get(this.getCacheKey(userId));
      if (!cachedValue) {
        return null;
      }

      // Handle both string and object responses from Redis
      let data: UserAuthData;
      if (typeof cachedValue === 'string') {
        data = JSON.parse(cachedValue) as UserAuthData;
      } else if (typeof cachedValue === 'object' && cachedValue !== null) {
        data = cachedValue as UserAuthData;
      } else {
        console.warn(`Unexpected cached value type for ${userId}:`, typeof cachedValue);
        return null;
      }

      return data;
    } catch (error) {
      console.error(
        `Failed to get cached user auth data for ${userId}:`,
        error
      );
      return null;
    }
  }

  async setUserAuthData(userId: string, signupStep: number): Promise<void> {
    if (!this.cache) {
      return;
    }

    try {
      const data: UserAuthData = {
        signup_step: signupStep,
        cached_at: Date.now(),
      };

      await this.cache.setex(
        this.getCacheKey(userId),
        CACHE_TTL_USER_AUTH,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error(`Failed to cache user auth data for ${userId}:`, error);
    }
  }

  async invalidateUserAuthData(userId: string): Promise<void> {
    if (!this.cache) {
      return;
    }

    try {
      await this.cache.del(this.getCacheKey(userId));
    } catch (error) {
      console.error(
        `Failed to invalidate user auth cache for ${userId}:`,
        error
      );
    }
  }
}
