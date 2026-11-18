import { createClient, RedisClientType } from "redis";
import { REDIS_URI } from "../../config";

export class CacheService {
  private readonly client: RedisClientType;
  constructor() {
    this.client = createClient({
      url: REDIS_URI,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });
    this.registerEvents();
  }

  private registerEvents(): void {
    this.client.on("error", (error: Error) => {
      console.error("Redis error:", error.message);
    });

    this.client.on("reconnecting", () => {
      console.log("Redis reconnecting...");
    });
  }

  async connect(): Promise<void> {
    if (this.client.isReady) return;

    if (!this.client.isOpen) {
      await this.client.connect();
      console.log("Redis connected successfully");
    }
  }

  async cacheSet({
    key,
    value,
    ttl = undefined,
  }: {
    key: string;
    value: any;
    ttl?: number | undefined;
  }) {
    if (typeof value == "object") {
      value = JSON.stringify(value);
    }

    return await this.client.set(key, value, { ...(ttl ? { EX: ttl } : {}) });
  }

  async cacheGet({ key }: { key: string }) {
    let value = await this.client.get(key);
    try {
      return JSON.parse(value as string);
    } catch (error) {
      return value;
    }
  }

  async cacheExist({ key }: { key: string }) {
    return await this.client.exists(key);
  }

  async cacheUpdate({
    key,
    value,
    ttl = undefined,
  }: {
    key: string;
    value: any;
    ttl?: number | undefined;
  }) {
    if (!(await this.cacheExist({ key }))) {
      return 0;
    }

    return await this.cacheSet({ key, value, ttl });
  }

  async cacheDelete({ key }: { key: string | string[] }) {
    return await this.client.del(key);
  }

  async cacheKeys({ prefix }: { prefix: string }) {
    return await this.client.keys(`${prefix}*`);
  }

  async cacheTTL({ key }: { key: string }) {
    return await this.client.ttl(key);
  }

  async cacheExpire({ key, ttl }: { key: string; ttl: number }) {
    return await this.client.expire(key, ttl);
  }

  async cacheIncrementBy({ key, value = 1 }: { key: string; value?: any }) {
    return await this.client.incrBy(key, value);
  }
}

export const cacheService = new CacheService();
