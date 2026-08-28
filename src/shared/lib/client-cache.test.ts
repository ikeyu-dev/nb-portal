import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearClientCache,
    getClientCache,
    getClientCacheEntry,
    getStaleClientCacheEntry,
    setClientCache,
} from "./client-cache";

describe("クライアントキャッシュ", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-28T00:00:00Z"));
    });

    it("データと保存時刻をlocalStorageへ保存する", () => {
        setClientCache("calendar", { count: 2 });

        expect(JSON.parse(localStorage.getItem("calendar") || "null")).toEqual({
            data: { count: 2 },
            timestamp: Date.now(),
        });
        expect(getClientCache("calendar", 60_000)).toEqual({ count: 2 });
    });

    it("session指定時はsessionStorageだけを使う", () => {
        setClientCache("tasks", ["TASK-001"], { storage: "session" });

        expect(localStorage.getItem("tasks")).toBeNull();
        expect(getClientCache("tasks", 60_000, { storage: "session" })).toEqual([
            "TASK-001",
        ]);
    });

    it("TTLを過ぎたキャッシュは削除する", () => {
        setClientCache("calendar", { count: 2 });
        vi.advanceTimersByTime(60_001);

        expect(getClientCacheEntry("calendar", 60_000)).toBeNull();
        expect(localStorage.getItem("calendar")).toBeNull();
    });

    it("TTL境界ちょうどのキャッシュは有効とする", () => {
        setClientCache("calendar", { count: 2 });
        vi.advanceTimersByTime(60_000);

        expect(getClientCache("calendar", 60_000)).toEqual({ count: 2 });
    });

    it("stale取得は通常TTLを無視し、maxAgeだけを適用する", () => {
        setClientCache("calendar", { count: 2 });
        vi.advanceTimersByTime(24 * 60 * 60 * 1000);

        expect(getStaleClientCacheEntry("calendar")?.data).toEqual({ count: 2 });
        expect(
            getStaleClientCacheEntry("calendar", {
                maxAgeMs: 60 * 60 * 1000,
            })
        ).toBeNull();
    });

    it("壊れたJSONや異なる構造を削除する", () => {
        localStorage.setItem("broken", "{");
        localStorage.setItem("invalid", JSON.stringify({ data: "value" }));

        expect(getStaleClientCacheEntry("broken")).toBeNull();
        expect(getStaleClientCacheEntry("invalid")).toBeNull();
        expect(localStorage.getItem("broken")).toBeNull();
        expect(localStorage.getItem("invalid")).toBeNull();
    });

    it("指定したキャッシュだけを削除する", () => {
        setClientCache("calendar", { count: 2 });
        setClientCache("tasks", { count: 1 });

        clearClientCache("calendar");

        expect(localStorage.getItem("calendar")).toBeNull();
        expect(localStorage.getItem("tasks")).not.toBeNull();
    });
});
