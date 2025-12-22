"use client";

import { useEffect, useState } from "react";

interface Item {
    [key: string]: string | number | boolean | Date;
}

type CategoryFilter = "all" | "MIC" | "SPK" | "CAB" | "OTHER";

const CATEGORY_MAP: Record<string, string> = {
    MIC: "マイク",
    SPK: "スピーカー",
    CAB: "ケーブル",
};

const CACHE_KEY = "nb-portal-items-cache";
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2時間（ミリ秒）

interface CachedData {
    items: Item[];
    timestamp: number;
}

const getCategoryFromItemId = (itemId: string): string => {
    const prefix = String(itemId).substring(0, 3).toUpperCase();
    return CATEGORY_MAP[prefix] || "その他";
};

const getCache = (): CachedData | null => {
    if (typeof window === "undefined") return null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        return JSON.parse(cached) as CachedData;
    } catch {
        return null;
    }
};

const setCache = (items: Item[]): void => {
    if (typeof window === "undefined") return;
    try {
        const data: CachedData = { items, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
        // localStorage容量超過時は無視
    }
};

const isCacheValid = (cache: CachedData): boolean => {
    return Date.now() - cache.timestamp < CACHE_DURATION;
};

export default function ItemsPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<CategoryFilter>("all");

    useEffect(() => {
        const fetchData = async () => {
            // キャッシュをチェック
            const cache = getCache();
            if (cache && isCacheValid(cache)) {
                setItems(cache.items);
                setIsLoading(false);
                return;
            }

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_GAS_API_URL}?path=items`
                );
                const data = await res.json();
                if (data.success) {
                    const fetchedItems = data.data || [];
                    setItems(fetchedItems);
                    setCache(fetchedItems);
                } else {
                    setError(data.error || "データの取得に失敗しました");
                }
            } catch (err) {
                // エラー時はキャッシュがあれば使用
                const cache = getCache();
                if (cache) {
                    setItems(cache.items);
                } else {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "データの取得に失敗しました"
                    );
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // フィルタリングされたアイテム
    const filteredItems =
        filter === "all"
            ? items
            : filter === "OTHER"
            ? items.filter((item) => {
                  const itemId = String(Object.values(item)[0]);
                  const prefix = itemId.substring(0, 3).toUpperCase();
                  return !["MIC", "SPK", "CAB"].includes(prefix);
              })
            : items.filter((item) => {
                  const itemId = String(Object.values(item)[0]);
                  return itemId.substring(0, 3).toUpperCase() === filter;
              });

    if (isLoading) {
        return (
            <div className="p-4 lg:p-6 w-full h-full flex items-center justify-center">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="max-lg:p-0 lg:p-6 w-full lg:h-full flex flex-col lg:items-stretch items-center bg-base-100 lg:overflow-hidden">
            {error && (
                <div className="alert alert-error mb-4 w-full max-w-4xl lg:hidden">
                    <span>{error}</span>
                </div>
            )}

            {/* ===== モバイル版 ===== */}
            <div
                className="lg:hidden w-full flex flex-col overflow-hidden"
                style={{ height: "calc(100dvh - 160px)" }}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 shrink-0">
                    <div className="flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                        </svg>
                        <span className="font-medium text-lg">機材一覧</span>
                        <span className="badge badge-primary badge-sm">
                            {filteredItems.length}件
                        </span>
                    </div>
                </div>

                {/* フィルターボタン（モバイル版） */}
                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-base-300 shrink-0">
                    <button
                        className={`btn btn-xs ${
                            filter === "all" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("all")}
                    >
                        すべて
                    </button>
                    <button
                        className={`btn btn-xs ${
                            filter === "MIC" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("MIC")}
                    >
                        マイク
                    </button>
                    <button
                        className={`btn btn-xs ${
                            filter === "SPK" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("SPK")}
                    >
                        スピーカー
                    </button>
                    <button
                        className={`btn btn-xs ${
                            filter === "CAB" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("CAB")}
                    >
                        ケーブル
                    </button>
                    <button
                        className={`btn btn-xs ${
                            filter === "OTHER" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("OTHER")}
                    >
                        その他
                    </button>
                </div>

                {/* テーブル（モバイル版） */}
                <div className="flex-1 min-h-0 overflow-auto">
                    <table className="table table-zebra table-pin-rows w-full text-sm">
                        <thead>
                            <tr>
                                <th className="bg-base-200 text-base-content">
                                    分類
                                </th>
                                <th className="bg-base-200 text-base-content">
                                    ITEM_ID
                                </th>
                                <th className="bg-base-200 text-base-content">
                                    NAME
                                </th>
                                <th className="bg-base-200 text-base-content">
                                    WHEN
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item, index) => {
                                    const values = Object.values(item);
                                    const itemId = String(values[0] ?? "");
                                    const name = String(values[1] ?? "");
                                    const when = String(values[2] ?? "");
                                    const category =
                                        getCategoryFromItemId(itemId);

                                    return (
                                        <tr key={index}>
                                            <td>
                                                <span
                                                    className={`badge badge-sm ${
                                                        category === "マイク"
                                                            ? "badge-info"
                                                            : category ===
                                                              "スピーカー"
                                                            ? "badge-success"
                                                            : category ===
                                                              "ケーブル"
                                                            ? "badge-warning"
                                                            : "badge-ghost"
                                                    }`}
                                                >
                                                    {category}
                                                </span>
                                            </td>
                                            <td className="font-mono text-xs">
                                                {itemId}
                                            </td>
                                            <td>{name}</td>
                                            <td className="text-xs">{when}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="text-center text-base-content/60 py-8"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-12 w-12 text-base-content/30"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                                />
                                            </svg>
                                            登録されている機材がありません
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== PC版 ===== */}
            {/* ヘッダー（PC版） */}
            <div className="hidden lg:flex items-center justify-between mb-4 px-2 w-full">
                <div className="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                    </svg>
                    <h2
                        className="font-normal text-base-content"
                        style={{ fontSize: "clamp(1.125rem, 3vw, 1.5rem)" }}
                    >
                        機材一覧
                    </h2>
                    <span className="badge badge-primary">
                        {filteredItems.length}件
                    </span>
                </div>

                {/* フィルターボタン（PC版） */}
                <div className="flex flex-wrap gap-2">
                    <button
                        className={`btn btn-sm ${
                            filter === "all" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("all")}
                    >
                        すべて
                    </button>
                    <button
                        className={`btn btn-sm ${
                            filter === "MIC" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("MIC")}
                    >
                        マイク
                    </button>
                    <button
                        className={`btn btn-sm ${
                            filter === "SPK" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("SPK")}
                    >
                        スピーカー
                    </button>
                    <button
                        className={`btn btn-sm ${
                            filter === "CAB" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("CAB")}
                    >
                        ケーブル
                    </button>
                    <button
                        className={`btn btn-sm ${
                            filter === "OTHER" ? "btn-primary" : "btn-outline"
                        }`}
                        onClick={() => setFilter("OTHER")}
                    >
                        その他
                    </button>
                </div>
            </div>

            {/* テーブル（PC版） */}
            <div className="hidden lg:flex flex-col flex-1 border border-base-300 rounded-lg overflow-hidden w-full">
                <div className="flex-1 min-h-0 overflow-auto">
                    <table className="table table-zebra table-pin-rows w-full">
                        <thead>
                            <tr>
                                <th className="bg-base-200 text-base-content">
                                    分類
                                </th>
                                <th className="bg-base-200 text-base-content">
                                    ITEM_ID
                                </th>
                                <th className="bg-base-200 text-base-content">
                                    NAME
                                </th>
                                <th className="bg-base-200 text-base-content">
                                    WHEN
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item, index) => {
                                    const values = Object.values(item);
                                    const itemId = String(values[0] ?? "");
                                    const name = String(values[1] ?? "");
                                    const when = String(values[2] ?? "");
                                    const category =
                                        getCategoryFromItemId(itemId);

                                    return (
                                        <tr key={index}>
                                            <td>
                                                <span
                                                    className={`badge ${
                                                        category === "マイク"
                                                            ? "badge-info"
                                                            : category ===
                                                              "スピーカー"
                                                            ? "badge-success"
                                                            : category ===
                                                              "ケーブル"
                                                            ? "badge-warning"
                                                            : "badge-ghost"
                                                    }`}
                                                >
                                                    {category}
                                                </span>
                                            </td>
                                            <td className="font-mono">
                                                {itemId}
                                            </td>
                                            <td>{name}</td>
                                            <td>{when}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="text-center text-base-content/60 py-8"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-12 w-12 text-base-content/30"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                                />
                                            </svg>
                                            登録されている機材がありません
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
