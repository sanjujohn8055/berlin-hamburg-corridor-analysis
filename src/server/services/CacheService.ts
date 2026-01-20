import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/Logger';

/**
 * Redis-based caching service
 */
export class CacheService {
  private client: RedisClientType;
  private logger = Logger.getInstance();
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Redis client disconnected');
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get(key: string, allowStale = false): Promise<string | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, cache miss for key:', key);
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        this.logger.debug('Cache hit for key:', key);
      } else {
        this.logger.debug('Cache miss for key:', key);
      }
      return value;
    } catch (error) {
      this.logger.error('Error getting cache key:', key, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set for key:', key);
      return;
    }

    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      this.logger.debug('Cache set for key:', key, 'TTL:', ttlSeconds);
    } catch (error) {
      this.logger.error('Error setting cache key:', key, error);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
      this.logger.debug('Cache deleted for key:', key);
    } catch (error) {
      this.logger.error('Error deleting cache key:', key, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.debug('Cache deleted for pattern:', pattern, 'Keys:', keys.length);
      }
    } catch (error) {
      this.logger.error('Error deleting cache pattern:', pattern, error);
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ connected: boolean; keyCount?: number }> {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('keyspace');
      const keyCount = this.parseKeyCount(info);
      return { connected: true, keyCount };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { connected: false };
    }
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.info('Redis connection closed');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Parse key count from Redis info
   */
  private parseKeyCount(info: string): number {
    const match = info.match(/keys=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}