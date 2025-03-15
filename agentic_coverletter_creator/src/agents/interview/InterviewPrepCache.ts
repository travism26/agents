import { InterviewPrepResult } from './interfaces/InterviewTypes';

/**
 * Cache for interview preparation results to avoid redundant API calls
 */
export class InterviewPrepCache {
  /** Map to store cached interview prep results */
  private cache: Map<string, { timestamp: number; data: InterviewPrepResult }>;

  /** Time-to-live for cache entries in milliseconds */
  private cacheTTL: number;

  /**
   * Creates a new instance of InterviewPrepCache
   * @param options Optional configuration options
   */
  constructor(options?: { ttl?: number }) {
    this.cache = new Map();
    // Default TTL is 24 hours (in milliseconds)
    this.cacheTTL = options?.ttl || 24 * 60 * 60 * 1000;
  }

  /**
   * Retrieves a cached interview prep result if available and not expired
   * @param companyName The name of the company
   * @param jobDescription The job description
   * @returns The cached interview prep result or undefined if not found or expired
   */
  async get(
    companyName: string,
    jobDescription: string
  ): Promise<InterviewPrepResult | undefined> {
    const key = this.generateCacheKey(companyName, jobDescription);
    const cached = this.cache.get(key);

    if (!cached) return undefined;

    // Check if the cached entry has expired
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.data;
  }

  /**
   * Stores an interview prep result in the cache
   * @param companyName The name of the company
   * @param jobDescription The job description
   * @param data The interview prep result to cache
   */
  async set(
    companyName: string,
    jobDescription: string,
    data: InterviewPrepResult
  ): Promise<void> {
    const key = this.generateCacheKey(companyName, jobDescription);
    this.cache.set(key, {
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Generates a cache key from the company name and job description
   * @param companyName The name of the company
   * @param jobDescription The job description
   * @returns A unique cache key
   */
  private generateCacheKey(
    companyName: string,
    jobDescription: string
  ): string {
    // Create a simple hash of the job description to keep the key length reasonable
    const jobHash = Buffer.from(jobDescription)
      .toString('base64')
      .substring(0, 10);
    return `${companyName.toLowerCase()}_${jobHash}`;
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Removes a specific entry from the cache
   * @param companyName The name of the company
   * @param jobDescription The job description
   * @returns True if an entry was removed, false otherwise
   */
  remove(companyName: string, jobDescription: string): boolean {
    const key = this.generateCacheKey(companyName, jobDescription);
    return this.cache.delete(key);
  }

  /**
   * Gets the number of entries in the cache
   * @returns The number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Removes all expired entries from the cache
   * @returns The number of entries removed
   */
  cleanExpired(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }
}
