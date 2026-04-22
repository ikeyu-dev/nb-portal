"use client";

export interface CachedData<T> {
    data: T;
    timestamp: number;
}

type ClientCacheStorage = "local" | "session";

interface ClientCacheOptions {
    storage?: ClientCacheStorage;
}

interface StaleClientCacheOptions extends ClientCacheOptions {
    maxAgeMs?: number;
}

function getStorage(storage: ClientCacheStorage): Storage | null {
    if (typeof window === "undefined") return null;
    return storage === "local" ? localStorage : sessionStorage;
}

function isCachedData<T>(value: unknown): value is CachedData<T> {
    if (!value || typeof value !== "object") return false;

    return (
        "data" in value &&
        "timestamp" in value &&
        typeof value.timestamp === "number"
    );
}

export function getClientCacheEntry<T>(
    key: string,
    ttlMs: number,
    options: ClientCacheOptions = {}
): CachedData<T> | null {
    const cached = getStaleClientCacheEntry<T>(key, options);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttlMs) {
        clearClientCache(key, options);
        return null;
    }

    return cached;
}

export function getStaleClientCacheEntry<T>(
    key: string,
    options: StaleClientCacheOptions = {}
): CachedData<T> | null {
    const storage = getStorage(options.storage ?? "local");
    if (!storage) return null;

    try {
        const cached = storage.getItem(key);
        if (!cached) return null;

        const parsed = JSON.parse(cached) as unknown;
        if (!isCachedData<T>(parsed)) {
            storage.removeItem(key);
            return null;
        }

        if (
            options.maxAgeMs !== undefined &&
            Date.now() - parsed.timestamp > options.maxAgeMs
        ) {
            storage.removeItem(key);
            return null;
        }

        return parsed;
    } catch {
        storage.removeItem(key);
        return null;
    }
}

export function getClientCache<T>(
    key: string,
    ttlMs: number,
    options: ClientCacheOptions = {}
): T | null {
    const cached = getClientCacheEntry<T>(key, ttlMs, options);
    return cached ? cached.data : null;
}

export function setClientCache<T>(
    key: string,
    data: T,
    options: ClientCacheOptions = {}
): void {
    const storage = getStorage(options.storage ?? "local");
    if (!storage) return;

    try {
        storage.setItem(
            key,
            JSON.stringify({
                data,
                timestamp: Date.now(),
            } satisfies CachedData<T>)
        );
    } catch {
        // セッションストレージに保存できない場合は無視
    }
}

export function clearClientCache(
    key: string,
    options: ClientCacheOptions = {}
): void {
    const storage = getStorage(options.storage ?? "local");
    storage?.removeItem(key);
}
