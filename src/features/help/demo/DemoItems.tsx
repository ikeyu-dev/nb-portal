"use client";

import { useState, useRef, useEffect } from "react";

type CategoryFilter = "all" | "MIC" | "SPK" | "CAB" | "OTHER";
type ItemCategory = "MIC" | "SPK" | "CAB" | "OTH";

interface DemoItem {
    itemId: string;
    name: string;
    when: string;
}

const CATEGORY_MAP: Record<string, string> = {
    MIC: "マイク",
    SPK: "スピーカー",
    CAB: "ケーブル",
    OTH: "その他",
};

const DEMO_ITEMS: DemoItem[] = [
    { itemId: "MIC001", name: "SHURE SM58", when: "2024/01/15" },
    { itemId: "MIC002", name: "SHURE SM58", when: "2024/01/15" },
    { itemId: "MIC003", name: "SHURE BETA58A", when: "2024/02/01" },
    { itemId: "SPK001", name: "YAMAHA DXR12", when: "2024/01/20" },
    { itemId: "SPK002", name: "YAMAHA DXR12", when: "2024/01/20" },
    { itemId: "CAB001", name: "XLRケーブル 5m", when: "2024/01/10" },
    { itemId: "CAB002", name: "XLRケーブル 10m", when: "2024/01/10" },
    { itemId: "OTH001", name: "マイクスタンド", when: "2024/03/01" },
];

const getCategoryFromItemId = (itemId: string): string => {
    const prefix = itemId.substring(0, 3).toUpperCase();
    return CATEGORY_MAP[prefix] || "その他";
};

/**
 * 機材一覧のデモコンポーネント
 */
export function DemoItems() {
    const [items, setItems] = useState<DemoItem[]>(DEMO_ITEMS);
    const [filter, setFilter] = useState<CategoryFilter>("all");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DemoItem | null>(null);

    const [createForm, setCreateForm] = useState({
        category: "MIC" as ItemCategory,
        name: "",
        count: 1,
    });
    const [editForm, setEditForm] = useState({ name: "" });

    const createModalRef = useRef<HTMLDialogElement>(null);
    const editModalRef = useRef<HTMLDialogElement>(null);

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

    const handleCreate = () => {
        if (!createForm.name.trim()) return;

        const prefix = createForm.category;
        const existingIds = items
            .filter((item) => item.itemId.startsWith(prefix))
            .map((item) => parseInt(item.itemId.substring(3)));
        const nextId = Math.max(0, ...existingIds) + 1;

        const newItems: DemoItem[] = [];
        for (let i = 0; i < createForm.count; i++) {
            newItems.push({
                itemId: `${prefix}${String(nextId + i).padStart(3, "0")}`,
                name: createForm.name,
                when: new Date().toLocaleDateString("ja-JP"),
            });
        }

        setItems([...items, ...newItems]);
        setIsCreateModalOpen(false);
        setCreateForm({ category: "MIC", name: "", count: 1 });
    };

    const handleEdit = () => {
        if (!selectedItem || !editForm.name.trim()) return;

        setItems(
            items.map((item) =>
                item.itemId === selectedItem.itemId
                    ? { ...item, name: editForm.name }
                    : item
            )
        );
        setIsEditModalOpen(false);
        setSelectedItem(null);
        setEditForm({ name: "" });
    };

    const handleDelete = () => {
        if (!selectedItem) return;

        setItems(items.filter((item) => item.itemId !== selectedItem.itemId));
        setIsEditModalOpen(false);
        setSelectedItem(null);
    };

    const openEditModal = (item: DemoItem) => {
        setSelectedItem(item);
        setEditForm({ name: item.name });
        setIsEditModalOpen(true);
    };

    const filteredItems =
        filter === "all"
            ? items
            : filter === "OTHER"
              ? items.filter((item) => {
                    const prefix = item.itemId.substring(0, 3).toUpperCase();
                    return !["MIC", "SPK", "CAB"].includes(prefix);
                })
              : items.filter(
                    (item) =>
                        item.itemId.substring(0, 3).toUpperCase() === filter
                );

    const FilterButtons = () => (
        <>
            <button
                className={`btn btn-xs ${filter === "all" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("all")}
            >
                すべて
            </button>
            <button
                className={`btn btn-xs ${filter === "MIC" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("MIC")}
            >
                マイク
            </button>
            <button
                className={`btn btn-xs ${filter === "SPK" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("SPK")}
            >
                スピーカー
            </button>
            <button
                className={`btn btn-xs ${filter === "CAB" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("CAB")}
            >
                ケーブル
            </button>
            <button
                className={`btn btn-xs ${filter === "OTHER" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setFilter("OTHER")}
            >
                その他
            </button>
        </>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-medium">機材一覧</span>
                    <span className="badge badge-primary badge-sm">
                        {filteredItems.length}件
                    </span>
                </div>
                <button
                    className="btn btn-primary btn-xs"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    追加
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <FilterButtons />
            </div>

            <div className="overflow-x-auto border border-base-300 rounded-lg">
                <table className="table table-zebra table-sm w-full">
                    <thead>
                        <tr>
                            <th className="bg-base-200">分類</th>
                            <th className="bg-base-200">ITEM_ID</th>
                            <th className="bg-base-200">NAME</th>
                            <th className="bg-base-200">WHEN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => {
                                const category = getCategoryFromItemId(
                                    item.itemId
                                );
                                return (
                                    <tr
                                        key={item.itemId}
                                        className="hover cursor-pointer"
                                        onClick={() => openEditModal(item)}
                                    >
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
                                            {item.itemId}
                                        </td>
                                        <td>{item.name}</td>
                                        <td className="text-xs">{item.when}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="text-center text-base-content/60 py-4"
                                >
                                    登録されている機材がありません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 機材登録モーダル */}
            <dialog
                ref={createModalRef}
                className="modal"
                onClose={() => setIsCreateModalOpen(false)}
            >
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">機材を登録</h3>

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
                    </div>

                    <div className="modal-action">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            キャンセル
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                        >
                            登録
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
                            onClick={handleDelete}
                        >
                            削除
                        </button>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                キャンセル
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleEdit}
                            >
                                保存
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

            <p className="text-xs text-base-content/50 text-center">
                これはデモ表示です。実際のデータとは異なります。
            </p>
        </div>
    );
}
