"use client";

export interface CachedData<T> {
    data: T;
    timestamp: number;
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
    ttlMs: number
): CachedData<T> | null {
    const cached = getStaleClientCacheEntry<T>(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttlMs) {
        return null;
    }

    return cached;
}

export function getStaleClientCacheEntry<T>(key: string): CachedData<T> | null {
    if (typeof window === "undefined") return null;

    try {
        const cached = sessionStorage.getItem(key);
        if (!cached) return null;

        const parsed = JSON.parse(cached) as unknown;
        if (!isCachedData<T>(parsed)) {
            sessionStorage.removeItem(key);
            return null;
        }

        return parsed;
    } catch {
        sessionStorage.removeItem(key);
        return null;
    }
}

export function getClientCache<T>(key: string, ttlMs: number): T | null {
    const cached = getClientCacheEntry<T>(key, ttlMs);
    return cached ? cached.data : null;
}

export function setClientCache<T>(key: string, data: T): void {
    if (typeof window === "undefined") return;

    try {
        sessionStorage.setItem(
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

export function clearClientCache(key: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(key);
}
