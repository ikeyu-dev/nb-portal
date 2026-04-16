"use client";

interface CachedData<T> {
    data: T;
    timestamp: number;
}

export function getClientCache<T>(key: string, ttlMs: number): T | null {
    if (typeof window === "undefined") return null;

    try {
        const cached = sessionStorage.getItem(key);
        if (!cached) return null;

        const parsed = JSON.parse(cached) as CachedData<T>;
        if (Date.now() - parsed.timestamp > ttlMs) {
            sessionStorage.removeItem(key);
            return null;
        }

        return parsed.data;
    } catch {
        return null;
    }
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
