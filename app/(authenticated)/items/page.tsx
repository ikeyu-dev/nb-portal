"use client";

import { useEffect, useState, useRef } from "react";
import { HelpButton } from "@/src/features/help";

interface Item {
    [key: string]: string | number | boolean | Date;
}

type CategoryFilter = "all" | "MIC" | "SPK" | "CAB" | "OTHER";
type ItemCategory = "MIC" | "SPK" | "CAB" | "OTH";

const CATEGORY_MAP: Record<string, string> = {
    MIC: "マイク",
    SPK: "スピーカー",
    CAB: "ケーブル",
    OTH: "その他",
};

const CACHE_KEY = "nb-portal-items-cache";
const CACHE_DURATION = 2 * 60 * 60 * 1000;

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

const clearCache = (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CACHE_KEY);
};

const isCacheValid = (cache: CachedData): boolean => {
    return Date.now() - cache.timestamp < CACHE_DURATION;
};

export default function ItemsPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<CategoryFilter>("all");

    // モーダル関連の状態
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
        itemId: string;
        name: string;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // フォーム状態
    const [createForm, setCreateForm] = useState({
        category: "MIC" as ItemCategory,
        name: "",
        count: 1,
    });
    const [editForm, setEditForm] = useState({
        name: "",
    });

    const createModalRef = useRef<HTMLDialogElement>(null);
    const editModalRef = useRef<HTMLDialogElement>(null);
    const deleteModalRef = useRef<HTMLDialogElement>(null);

    const fetchItems = async (useCache = true) => {
        if (useCache) {
            const cache = getCache();
            if (cache && isCacheValid(cache)) {
                setItems(cache.items);
                setIsLoading(false);
                return;
            }
        }

        try {
            const res = await fetch("/api/gas?path=items");
            const data = await res.json();
            if (data.success) {
                const fetchedItems = data.data || [];
                setItems(fetchedItems);
                setCache(fetchedItems);
            } else {
                setError(data.error || "データの取得に失敗しました");
            }
        } catch (err) {
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

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {
        if (isCreateModalOpen) {
            createModalRef.current?.showModal();
        } else {
            createModalRef.current?.close();
        }
    }, [isCreateModalOpen]);

    useEffect(() => {
        if (isEditModalOpen) {
            editModalRef.current?.showModal();
        } else {
            editModalRef.current?.close();
        }
    }, [isEditModalOpen]);

    useEffect(() => {
        if (isDeleteModalOpen) {
            deleteModalRef.current?.showModal();
        } else {
            deleteModalRef.current?.close();
        }
    }, [isDeleteModalOpen]);

    const handleCreate = async () => {
        if (!createForm.name.trim()) {
            setModalError("機材名を入力してください");
            return;
        }

        setIsSubmitting(true);
        setModalError(null);

        try {
            const res = await fetch("/api/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createForm),
            });
            const data = await res.json();

            if (data.success) {
                setIsCreateModalOpen(false);
                setCreateForm({ category: "MIC", name: "", count: 1 });
                clearCache();
                await fetchItems(false);
            } else {
                setModalError(data.error || "登録に失敗しました");
            }
        } catch {
            setModalError("登録に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedItem || !editForm.name.trim()) {
            setModalError("機材名を入力してください");
            return;
        }

        setIsSubmitting(true);
        setModalError(null);

        try {
            const res = await fetch("/api/items", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemId: selectedItem.itemId,
                    name: editForm.name,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setIsEditModalOpen(false);
                setSelectedItem(null);
                setEditForm({ name: "" });
                clearCache();
                await fetchItems(false);
            } else {
                setModalError(data.error || "更新に失敗しました");
            }
        } catch {
            setModalError("更新に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedItem) return;

        setIsSubmitting(true);
        setModalError(null);

        try {
            const res = await fetch("/api/items", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: selectedItem.itemId }),
            });
            const data = await res.json();

            if (data.success) {
                setIsDeleteModalOpen(false);
                setSelectedItem(null);
                clearCache();
                await fetchItems(false);
            } else {
                setModalError(data.error || "削除に失敗しました");
            }
        } catch {
            setModalError("削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (itemId: string, name: string) => {
        setSelectedItem({ itemId, name });
        setEditForm({ name });
        setModalError(null);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (itemId: string, name: string) => {
        setSelectedItem({ itemId, name });
        setModalError(null);
        setIsDeleteModalOpen(true);
    };

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
            <div className="p-4 lg:p-6 w-full">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                        <div className="h-8 w-32 bg-base-300 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="card-body">
                            <div className="flex items-center justify-center py-12">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const renderTableRow = (item: Item, index: number, isMobile: boolean) => {
        const values = Object.values(item);
        const itemId = String(values[0] ?? "");
        const name = String(values[1] ?? "");
        const when = String(values[2] ?? "");
        const category = getCategoryFromItemId(itemId);

        return (
            <tr
                key={index}
                className="hover cursor-pointer"
                onClick={() => openEditModal(itemId, name)}
            >
                <td>
                    <span
                        className={`badge ${isMobile ? "badge-sm" : ""} ${
                            category === "マイク"
                                ? "badge-info"
                                : category === "スピーカー"
                                  ? "badge-success"
                                  : category === "ケーブル"
                                    ? "badge-warning"
                                    : "badge-ghost"
                        }`}
                    >
                        {category}
                    </span>
                </td>
                <td className={`font-mono ${isMobile ? "text-xs" : ""}`}>
                    {itemId}
                </td>
                <td>{name}</td>
                <td className={isMobile ? "text-xs" : ""}>{when}</td>
            </tr>
        );
    };

    const renderEmptyRow = () => (
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
    );

    const FilterButtons = ({ size }: { size: "xs" | "sm" }) => (
        <>
            <button
                className={`btn btn-${size} ${filter === "all" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("all")}
            >
                すべて
            </button>
            <button
                className={`btn btn-${size} ${filter === "MIC" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("MIC")}
            >
                マイク
            </button>
            <button
                className={`btn btn-${size} ${filter === "SPK" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("SPK")}
            >
                スピーカー
            </button>
            <button
                className={`btn btn-${size} ${filter === "CAB" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("CAB")}
            >
                ケーブル
            </button>
            <button
                className={`btn btn-${size} ${filter === "OTHER" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("OTHER")}
            >
                その他
            </button>
        </>
    );

    return (
        <div className="max-lg:p-0 lg:p-6 w-full lg:h-full flex flex-col lg:items-stretch items-center bg-base-100 lg:overflow-hidden">
            {error && (
                <div className="alert alert-error mb-4 w-full max-w-4xl lg:hidden">
                    <span>{error}</span>
                </div>
            )}

            {/* モバイル版 */}
            <div
                className="lg:hidden w-full flex flex-col overflow-hidden"
                style={{ height: "calc(100dvh - 160px)" }}
            >
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
                        <HelpButton sectionId="items" />
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                            setModalError(null);
                            setIsCreateModalOpen(true);
                        }}
                    >
                        追加
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-base-300 shrink-0">
                    <FilterButtons size="xs" />
                </div>

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
                            {filteredItems.length > 0
                                ? filteredItems.map((item, index) =>
                                      renderTableRow(item, index, true)
                                  )
                                : renderEmptyRow()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PC版 */}
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
                    <HelpButton sectionId="items" />
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-wrap gap-2">
                        <FilterButtons size="sm" />
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                            setModalError(null);
                            setIsCreateModalOpen(true);
                        }}
                    >
                        機材を追加
                    </button>
                </div>
            </div>

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
                            {filteredItems.length > 0
                                ? filteredItems.map((item, index) =>
                                      renderTableRow(item, index, false)
                                  )
                                : renderEmptyRow()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 機材登録モーダル */}
            <dialog
                ref={createModalRef}
                className="modal"
                onClose={() => setIsCreateModalOpen(false)}
            >
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">機材を登録</h3>

                    {modalError && (
                        <div className="alert alert-error mb-4">
                            <span>{modalError}</span>
                        </div>
                    )}

                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">カテゴリ</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={createForm.category}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    category: e.target.value as ItemCategory,
                                })
                            }
                        >
                            <option value="MIC">マイク</option>
                            <option value="SPK">スピーカー</option>
                            <option value="CAB">ケーブル</option>
                            <option value="OTH">その他</option>
                        </select>
                    </div>

                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">機材名</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="例: SHURE SM58"
                            value={createForm.name}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">登録数</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            min={1}
                            max={100}
                            value={createForm.count}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    count: parseInt(e.target.value) || 1,
                                })
                            }
                        />
                        <label className="label">
                            <span className="label-text-alt">
                                同じ機材を複数登録する場合は数量を指定
                            </span>
                        </label>
                    </div>

                    <div className="modal-action">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsCreateModalOpen(false)}
                            disabled={isSubmitting}
                        >
                            キャンセル
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                "登録"
                            )}
                        </button>
                    </div>
                </div>
                <form
                    method="dialog"
                    className="modal-backdrop"
                >
                    <button>close</button>
                </form>
            </dialog>

            {/* 機材編集モーダル */}
            <dialog
                ref={editModalRef}
                className="modal"
                onClose={() => setIsEditModalOpen(false)}
            >
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">機材を編集</h3>

                    {modalError && (
                        <div className="alert alert-error mb-4">
                            <span>{modalError}</span>
                        </div>
                    )}

                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">機材ID</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={selectedItem?.itemId || ""}
                            disabled
                        />
                    </div>

                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">機材名</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={editForm.name}
                            onChange={(e) =>
                                setEditForm({ name: e.target.value })
                            }
                        />
                    </div>

                    <div className="modal-action justify-between">
                        <button
                            className="btn btn-error btn-outline"
                            onClick={() => {
                                setIsEditModalOpen(false);
                                if (selectedItem) {
                                    openDeleteModal(
                                        selectedItem.itemId,
                                        selectedItem.name
                                    );
                                }
                            }}
                            disabled={isSubmitting}
                        >
                            削除
                        </button>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                キャンセル
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleEdit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                    "保存"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                <form
                    method="dialog"
                    className="modal-backdrop"
                >
                    <button>close</button>
                </form>
            </dialog>

            {/* 削除確認モーダル */}
            <dialog
                ref={deleteModalRef}
                className="modal"
                onClose={() => setIsDeleteModalOpen(false)}
            >
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">機材を削除</h3>

                    {modalError && (
                        <div className="alert alert-error mb-4">
                            <span>{modalError}</span>
                        </div>
                    )}

                    <p className="mb-4">
                        以下の機材を削除してもよろしいですか？
                    </p>

                    <div className="bg-base-200 p-4 rounded-lg mb-4">
                        <p>
                            <span className="font-medium">機材ID:</span>{" "}
                            {selectedItem?.itemId}
                        </p>
                        <p>
                            <span className="font-medium">機材名:</span>{" "}
                            {selectedItem?.name}
                        </p>
                    </div>

                    <p className="text-sm text-base-content/60 mb-4">
                        この操作は取り消せません。
                    </p>

                    <div className="modal-action">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isSubmitting}
                        >
                            キャンセル
                        </button>
                        <button
                            className="btn btn-error"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                "削除"
                            )}
                        </button>
                    </div>
                </div>
                <form
                    method="dialog"
                    className="modal-backdrop"
                >
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}
