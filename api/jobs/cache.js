/**
 * Job Cache Manager
 * Implements in-memory caching with TTL to reduce API calls
 */

class JobCache {
  constructor(ttlMinutes = 60) {
    this.cache = null;
    this.lastFetchTime = 0;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Get cached jobs if still valid
   */
  get() {
    const now = Date.now();
    if (this.cache && (now - this.lastFetchTime) < this.ttlMs) {
      console.log('[Cache] Returning cached jobs');
      return this.cache;
    }
    return null;
  }

  /**
   * Set cache with timestamp
   */
  set(jobs) {
    this.cache = jobs;
    this.lastFetchTime = Date.now();
    console.log(`[Cache] Cached ${jobs.length} jobs, TTL: ${this.ttlMs / 60000} minutes`);
  }

  /**
   * Check if cache is valid
   */
  isValid() {
    return this.cache && (Date.now() - this.lastFetchTime) < this.ttlMs;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache = null;
    this.lastFetchTime = 0;
    console.log('[Cache] Cache cleared');
  }

  /**
   * Get cache age in seconds
   */
  getAgeSeconds() {
    return Math.floor((Date.now() - this.lastFetchTime) / 1000);
  }
}

export const jobCache = new JobCache(60); // 60 minute TTL
