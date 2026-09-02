"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen } from "@fortawesome/free-solid-svg-icons";
import { HelpButton } from "@/src/features/help";
import type { ApiResponse, Item } from "@/src/shared/types/api";
import {
    clearClientCache,
    getClientCacheEntry,
    getStaleClientCacheEntry,
    setClientCache,
} from "@/src/shared/lib/client-cache";
import {
    CACHE_TTL_MS,
    CLIENT_CACHE_KEYS,
} from "@/src/shared/lib/cache-policy";
import { useUrlModal } from "@/src/shared/lib/use-url-modal";
import { AppModal } from "@/src/shared/ui/AppModal";
import { AsyncButton } from "@/src/shared/ui/AsyncButton";
import { AnimatedAlert } from "@/src/shared/ui/AnimatedAlert";

type CategoryFilter = "all" | "MIC" | "SPK" | "CAB" | "OTHER";
type ItemCategory = "MIC" | "SPK" | "CAB" | "OTH";
const LIST_EXIT_ANIMATION_MS = 160;

const CATEGORY_MAP: Record<string, string> = {
    MIC: "マイク",
    SPK: "スピーカー",
    CAB: "ケーブル",
    OTH: "その他",
};

const getCategoryFromItemId = (itemId: string): string => {
    const prefix = String(itemId).substring(0, 3).toUpperCase();
    return CATEGORY_MAP[prefix] || "その他";
};

export default function ItemsPage() {
    const {
        modal,
        getModalParam,
        openModal,
        replaceModal,
        closeModal,
    } = useUrlModal();
    const modalItemId = getModalParam("item");
    const isCreateModalOpen = modal === "item-create";
    const isEditModalOpen = modal === "item-edit";
    const isDeleteModalOpen = modal === "item-delete";
    const [items, setItems] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<CategoryFilter>("all");
    const [enteringItemId, setEnteringItemId] = useState<string | null>(null);
    const [exitingItemId, setExitingItemId] = useState<string | null>(null);

    // モーダルの表示状態と対象IDはURLで管理する
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

    const fetchItems = useCallback(async (
        useCache = true,
        previousItemIds?: Set<string>
    ) => {
        if (useCache) {
            const cache = getClientCacheEntry<Item[]>(
                CLIENT_CACHE_KEYS.items,
                CACHE_TTL_MS.pageData
            );
            if (cache) {
                setItems(cache.data);
                setIsLoading(false);
            }
        }

        try {
            const res = await fetch("/api/backend?path=items", {
                cache: "no-store",
            });
            const data = (await res.json()) as ApiResponse<Item[]>;
            if (data.success) {
                const fetchedItems = data.data || [];
                if (previousItemIds) {
                    const addedItem = fetchedItems.find(
                        (item) =>
                            !previousItemIds.has(
                                String(Object.values(item)[0] ?? "")
                            )
                    );
                    setEnteringItemId(
                        addedItem
                            ? String(Object.values(addedItem)[0] ?? "")
                            : null
                    );
                }
                setItems(fetchedItems);
                setClientCache(CLIENT_CACHE_KEYS.items, fetchedItems);
            } else {
                setError(data.error || "機材一覧を取得できませんでした");
            }
        } catch (err) {
            const cache = getStaleClientCacheEntry<Item[]>(
                CLIENT_CACHE_KEYS.items,
                { maxAgeMs: CACHE_TTL_MS.stalePageData }
            );
            if (cache) {
                setItems(cache.data);
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : "機材一覧を取得できませんでした"
                );
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    useEffect(() => {
        if (isLoading) return;

        if (modal === "item-create") {
            setModalError(null);
            return;
        }

        if (
            (modal === "item-edit" || modal === "item-delete") &&
            modalItemId
        ) {
            const item = items.find(
                (currentItem) =>
                    String(Object.values(currentItem)[0]) === modalItemId
            );
            if (!item) return;

            const name = String(Object.values(item)[1] ?? "");
            setSelectedItem({ itemId: modalItemId, name });
            setModalError(null);
            if (modal === "item-edit") {
                setEditForm({ name });
            }
        }
    }, [isLoading, items, modal, modalItemId]);

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
            const data = (await res.json()) as ApiResponse<null>;

            if (data.success) {
                const previousItemIds = new Set(
                    items.map((item) => String(Object.values(item)[0] ?? ""))
                );
                closeModal(["item"]);
                clearClientCache(CLIENT_CACHE_KEYS.items);
                await fetchItems(false, previousItemIds);
            } else {
                setModalError(data.error || "機材を登録できませんでした");
            }
        } catch {
            setModalError("機材を登録できませんでした");
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
            const data = (await res.json()) as ApiResponse<null>;

            if (data.success) {
                closeModal(["item"]);
                clearClientCache(CLIENT_CACHE_KEYS.items);
                await fetchItems(false);
            } else {
                setModalError(data.error || "機材を更新できませんでした");
            }
        } catch {
            setModalError("機材を更新できませんでした");
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
            const data = (await res.json()) as ApiResponse<null>;

            if (data.success) {
                const deletedItemId = selectedItem.itemId;
                setExitingItemId(deletedItemId);
                closeModal(["item"]);
                await new Promise((resolve) =>
                    window.setTimeout(resolve, LIST_EXIT_ANIMATION_MS)
                );
                clearClientCache(CLIENT_CACHE_KEYS.items);
                await fetchItems(false);
                setExitingItemId(null);
            } else {
                setModalError(data.error || "機材を削除できませんでした");
            }
        } catch {
            setModalError("機材を削除できませんでした");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (itemId: string, name: string) => {
        setSelectedItem({ itemId, name });
        setEditForm({ name });
        setModalError(null);
        openModal("item-edit", { item: itemId });
    };

    const openCreateModal = () => {
        setCreateForm({ category: "MIC", name: "", count: 1 });
        setModalError(null);
        openModal("item-create", { item: null });
    };

    const openDeleteModal = (
        itemId: string,
        name: string,
        replace = false
    ) => {
        setSelectedItem({ itemId, name });
        setModalError(null);
        if (replace) {
            replaceModal("item-delete", { item: itemId });
        } else {
            openModal("item-delete", { item: itemId });
        }
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

    const renderTableRow = (item: Item, isMobile: boolean) => {
        const values = Object.values(item);
        const itemId = String(values[0] ?? "");
        const name = String(values[1] ?? "");
        const when = String(values[2] ?? "");
        const category = getCategoryFromItemId(itemId);

        return (
            <tr
                key={`${isMobile ? "mobile" : "desktop"}-${itemId}`}
                data-motion={
                    exitingItemId === itemId
                        ? "exit"
                        : enteringItemId === itemId
                          ? "enter"
                          : undefined
                }
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
                    <FontAwesomeIcon
                        icon={faBoxOpen}
                        className="text-5xl text-base-content/30"
                    />
                    登録されている機材がありません
                </div>
            </td>
        </tr>
    );

    const FilterButtons = ({ size }: { size: "xs" | "sm" }) => (
        <>
            <button
                type="button"
                aria-pressed={filter === "all"}
                className={`btn btn-${size} ${filter === "all" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("all")}
            >
                すべて
            </button>
            <button
                type="button"
                aria-pressed={filter === "MIC"}
                className={`btn btn-${size} ${filter === "MIC" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("MIC")}
            >
                マイク
            </button>
            <button
                type="button"
                aria-pressed={filter === "SPK"}
                className={`btn btn-${size} ${filter === "SPK" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("SPK")}
            >
                スピーカー
            </button>
            <button
                type="button"
                aria-pressed={filter === "CAB"}
                className={`btn btn-${size} ${filter === "CAB" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("CAB")}
            >
                ケーブル
            </button>
            <button
                type="button"
                aria-pressed={filter === "OTHER"}
                className={`btn btn-${size} ${filter === "OTHER" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("OTHER")}
            >
                その他
            </button>
        </>
    );

    return (
        <div className="app-content-enter max-lg:p-0 lg:p-6 w-full lg:h-full flex flex-col lg:items-stretch items-center bg-base-100 lg:overflow-hidden">
            <AnimatedAlert
                show={Boolean(error)}
                variant="error"
                className="mb-4 w-full max-w-4xl lg:hidden"
            >
                <span>{error}</span>
            </AnimatedAlert>

            {/* モバイル版 */}
            <div
                className="lg:hidden w-full flex flex-col overflow-hidden"
                style={{ height: "calc(100dvh - 160px)" }}
            >
                <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 shrink-0">
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                            icon={faBoxOpen}
                            className="text-xl text-primary"
                        />
                        <span className="font-medium text-lg">機材一覧</span>
                        <span className="badge badge-primary badge-sm">
                            {filteredItems.length}件
                        </span>
                        <HelpButton sectionId="items" />
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={openCreateModal}
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
                        <tbody
                            key={`mobile-${filter}`}
                            className="app-filter-results"
                        >
                            {filteredItems.length > 0
                                ? filteredItems.map((item) =>
                                      renderTableRow(item, true)
                                  )
                                : renderEmptyRow()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PC版 */}
            <div className="hidden lg:flex items-center justify-between mb-4 px-2 w-full">
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon
                        icon={faBoxOpen}
                        className="text-2xl text-primary"
                    />
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
                        onClick={openCreateModal}
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
                        <tbody
                            key={`desktop-${filter}`}
                            className="app-filter-results"
                        >
                            {filteredItems.length > 0
                                ? filteredItems.map((item) =>
                                      renderTableRow(item, false)
                                  )
                                : renderEmptyRow()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 機材登録モーダル */}
            <AppModal
                    open={isCreateModalOpen}
                    onClose={() => closeModal(["item"])}
                    ariaLabel="機材を登録"
                    boxClassName="max-w-md max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)]"
                >
                    <h3 className="font-bold text-lg mb-4">機材を登録</h3>

                    <AnimatedAlert
                        show={Boolean(modalError)}
                        variant="error"
                        className="mb-4"
                    >
                        <span>{modalError}</span>
                    </AnimatedAlert>

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
                            onClick={() => closeModal(["item"])}
                            disabled={isSubmitting}
                        >
                            キャンセル
                        </button>
                        <AsyncButton
                            className="btn btn-primary"
                            onClick={handleCreate}
                            loading={isSubmitting}
                            loadingLabel="登録中"
                        >
                            登録
                        </AsyncButton>
                    </div>
            </AppModal>

            {/* 機材編集モーダル */}
            <AppModal
                    open={isEditModalOpen && Boolean(selectedItem)}
                    onClose={() => closeModal(["item"])}
                    ariaLabel="機材を編集"
                    boxClassName="max-w-md max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)]"
                >
                    <h3 className="font-bold text-lg mb-4">機材を編集</h3>

                    <AnimatedAlert
                        show={Boolean(modalError)}
                        variant="error"
                        className="mb-4"
                    >
                        <span>{modalError}</span>
                    </AnimatedAlert>

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
                                if (selectedItem) {
                                    openDeleteModal(
                                        selectedItem.itemId,
                                        selectedItem.name,
                                        true
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
                                onClick={() => closeModal(["item"])}
                                disabled={isSubmitting}
                            >
                                キャンセル
                            </button>
                            <AsyncButton
                                className="btn btn-primary"
                                onClick={handleEdit}
                                loading={isSubmitting}
                                loadingLabel="保存中"
                            >
                                保存
                            </AsyncButton>
                        </div>
                    </div>
            </AppModal>

            {/* 削除確認モーダル */}
            <AppModal
                    open={isDeleteModalOpen && Boolean(selectedItem)}
                    onClose={() => closeModal(["item"])}
                    ariaLabel="機材を削除"
                    boxClassName="max-w-md max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)]"
                >
                    <h3 className="font-bold text-lg mb-4">機材を削除</h3>

                    <AnimatedAlert
                        show={Boolean(modalError)}
                        variant="error"
                        className="mb-4"
                    >
                        <span>{modalError}</span>
                    </AnimatedAlert>

                    <p className="mb-4">
                        この機材を削除しますか？
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
                            onClick={() => closeModal(["item"])}
                            disabled={isSubmitting}
                        >
                            キャンセル
                        </button>
                        <AsyncButton
                            className="btn btn-error"
                            onClick={handleDelete}
                            loading={isSubmitting}
                            loadingLabel="削除中"
                        >
                            削除
                        </AsyncButton>
                    </div>
            </AppModal>
        </div>
    );
}
