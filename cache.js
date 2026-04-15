class CacheError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

class OfflineCacheMissError extends CacheError {}

class OfflineAwareCache {
  constructor() {
    this.store = new Map();
    this.inflight = new Map();
  }

  set(key, value, ttlMs, staleTtlMs = ttlMs * 6) {
    if (typeof key !== "string" || !key.trim()) {
      throw new CacheError("Cache key must be a non-empty string", "INVALID_CACHE_KEY");
    }

    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new CacheError("ttlMs must be a positive number", "INVALID_TTL");
    }

    if (!Number.isFinite(staleTtlMs) || staleTtlMs < ttlMs) {
      throw new CacheError(
        "staleTtlMs must be a number greater than or equal to ttlMs",
        "INVALID_STALE_TTL"
      );
    }

    const now = Date.now();

    this.store.set(key, {
      value,
      cachedAt: now,
      expiresAt: now + ttlMs,
      staleExpiresAt: now + staleTtlMs,
    });
  }

  getEntry(key) {
    return this.store.get(key) ?? null;
  }

  getFresh(key) {
    const entry = this.getEntry(key);

    if (!entry) {
      return null;
    }

    if (Date.now() <= entry.expiresAt) {
      return entry.value;
    }

    return null;
  }

  getStale(key) {
    const entry = this.getEntry(key);

    if (!entry) {
      return null;
    }

    if (Date.now() <= entry.staleExpiresAt) {
      return entry.value;
    }

    this.store.delete(key);
    return null;
  }

  getState(key) {
    const entry = this.getEntry(key);

    if (!entry) {
      return { state: "miss", data: null, cachedAt: null };
    }

    const now = Date.now();

    if (now <= entry.expiresAt) {
      return {
        state: "fresh",
        data: entry.value,
        cachedAt: entry.cachedAt,
      };
    }

    if (now <= entry.staleExpiresAt) {
      return {
        state: "stale",
        data: entry.value,
        cachedAt: entry.cachedAt,
      };
    }

    this.store.delete(key);
    return { state: "miss", data: null, cachedAt: null };
  }

  delete(key) {
    this.store.delete(key);
    this.inflight.delete(key);
  }

  clear() {
    this.store.clear();
    this.inflight.clear();
  }

  async getOrFetch(key, fetcher, options = {}) {
    if (typeof fetcher !== "function") {
      throw new CacheError("fetcher must be a function", "INVALID_FETCHER");
    }

    const {
      ttlMs = 10 * 60 * 1000,
      staleTtlMs = 60 * 60 * 1000,
      isOffline = () => false,
      allowStaleOnError = true,
      allowStaleWhenOffline = true,
    } = options;

    const cached = this.getState(key);

    if (cached.state === "fresh") {
      return {
        source: "cache-fresh",
        data: cached.data,
        cachedAt: cached.cachedAt,
      };
    }

    const offline = await Promise.resolve(isOffline());

    if (offline && allowStaleWhenOffline && cached.state === "stale") {
      return {
        source: "cache-stale-offline",
        data: cached.data,
        cachedAt: cached.cachedAt,
      };
    }

    if (offline && cached.state === "miss") {
      throw new OfflineCacheMissError(
        "No internet connection and no cached data available",
        "OFFLINE_CACHE_MISS"
      );
    }

    if (this.inflight.has(key)) {
      return this.inflight.get(key);
    }

    const promise = (async () => {
      try {
        const freshData = await fetcher();

        this.set(key, freshData, ttlMs, staleTtlMs);

        return {
          source: "network",
          data: freshData,
          cachedAt: Date.now(),
        };
      } catch (error) {
        if (allowStaleOnError && cached.state === "stale") {
          return {
            source: "cache-stale-fallback",
            data: cached.data,
            cachedAt: cached.cachedAt,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        throw error;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }
}

function normalizeCity(city) {
  if (typeof city !== "string" || !city.trim()) {
    throw new CacheError("City name is required", "CITY_REQUIRED");
  }

  return city.trim().toLowerCase();
}

function buildWeatherCacheKey(city) {
  return `weather:${normalizeCity(city)}`;
}

function createIsOfflineResolver() {
  return () => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return !navigator.onLine;
    }

    return false;
  };
}

module.exports = {
  CacheError,
  OfflineCacheMissError,
  OfflineAwareCache,
  normalizeCity,
  buildWeatherCacheKey,
  createIsOfflineResolver,
};