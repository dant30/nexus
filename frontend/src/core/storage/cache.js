const CACHE_KEY = "nexus_cache";

export const cacheStorage = {
  get() {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  },
  set(cache) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },
  put(key, value, ttlMs = 60000) {
    const cache = this.get();
    cache[key] = { value, expiresAt: Date.now() + ttlMs };
    this.set(cache);
  },
  fetch(key) {
    const cache = this.get();
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete cache[key];
      this.set(cache);
      return null;
    }
    return entry.value;
  }
};
