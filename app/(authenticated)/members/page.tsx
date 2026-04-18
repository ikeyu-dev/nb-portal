"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
    MemberRow,
    MembersData,
    SheetCellValue,
} from "@/src/shared/types/api";

const MEMBERS_CACHE_KEY = "nb-portal-members-cache";

const HEADER_LABELS: Record<string, string> = {
    studentnumber: "学籍番号",
    name: "氏名",
    nickname: "ニックネーム",
    isjoinedline: "LINE参加",
    linename: "LINE名",
    isjoineddiscord: "Discord参加",
    discordname: "Discord名",
    issigned: "団体結成届サイン",
};

const getHeaderLabel = (header: string): string =>
    HEADER_LABELS[header.trim().toLowerCase()] || header;

const stringifyCell = (value: SheetCellValue): string => {
    if (value === null || value === undefined) return "";
    return String(value);
};

const isBooleanCell = (value: SheetCellValue | string): boolean => {
    if (typeof value === "boolean") return true;
    if (typeof value !== "string") return false;

    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "false";
};

const getBooleanCellValue = (value: SheetCellValue | string): boolean => {
    if (typeof value === "boolean") return value;
    return String(value).trim().toLowerCase() === "true";
};

const normalizeEditableValues = (
    values: string[],
    sourceValues: SheetCellValue[] = []
): Array<string | boolean> =>
    values.map((value, index) =>
        isBooleanCell(sourceValues[index] ?? value)
            ? getBooleanCellValue(value)
            : value
    );

function BooleanToggle({
    checked,
    disabled = false,
    readOnly = false,
    onChange,
}: {
    checked: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    onChange?: (checked: boolean) => void;
}) {
    return (
        <input
            type="checkbox"
            className={`toggle checked:border-primary checked:bg-primary checked:text-primary-content ${
                readOnly ? "pointer-events-none" : ""
            }`}
            checked={checked}
            disabled={disabled}
            readOnly={readOnly || !onChange}
            onChange={(event) => {
                if (readOnly) return;
                onChange?.(event.target.checked);
            }}
            aria-label={checked ? "true" : "false"}
        />
    );
}

function MemberField({
    label,
    value,
    sourceValue,
    onChange,
}: {
    label: string;
    value: string;
    sourceValue?: SheetCellValue;
    onChange: (value: string) => void;
}) {
    const isBoolean = isBooleanCell(sourceValue ?? value);
    const shouldUseTextarea = value.includes("\n") || value.length > 60;

    return (
        <div className="form-control rounded-lg border border-base-300 bg-base-100 p-4">
            <div className="label pt-0">
                <span className="label-text font-medium">{label}</span>
            </div>
            {isBoolean ? (
                <div className="flex items-center justify-between rounded-lg bg-base-200 px-4 py-3">
                    <span className="text-sm text-base-content/70">
                        {getBooleanCellValue(value) ? "完了" : "未完了"}
                    </span>
                    <BooleanToggle
                        checked={getBooleanCellValue(value)}
                        onChange={(checked) => onChange(String(checked))}
                    />
                </div>
            ) : shouldUseTextarea ? (
                <textarea
                    className="textarea textarea-bordered min-h-28 w-full"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <input
                    type="text"
                    className="input input-bordered w-full"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
        </div>
    );
}

const getPrimaryValue = (member: MemberRow, headers: string[]): string => {
    const preferredHeaders = ["氏名", "名前", "Name", "name"];
    const preferredIndex = headers.findIndex((header) =>
        preferredHeaders.some((preferred) => header.includes(preferred))
    );

    if (preferredIndex >= 0) {
        return stringifyCell(member.values[preferredIndex]) || "選択した名簿";
    }

    return stringifyCell(member.values[0]) || "選択した名簿";
};

const normalizeSearchTarget = (member: MemberRow): string =>
    member.values.map(stringifyCell).join(" ").toLowerCase();

const isNameHeader = (header: string): boolean =>
    header.trim().toLowerCase() === "name";

const isNicknameHeader = (header: string): boolean =>
    header.trim().toLowerCase() === "nickname";

const getMembersCache = (): MembersData | null => {
    if (typeof window === "undefined") return null;

    try {
        const cached = sessionStorage.getItem(MEMBERS_CACHE_KEY);
        if (!cached) return null;
        return JSON.parse(cached) as MembersData;
    } catch {
        sessionStorage.removeItem(MEMBERS_CACHE_KEY);
        return null;
    }
};

const setMembersCache = (data: MembersData): void => {
    if (typeof window === "undefined") return;

    try {
        sessionStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(data));
    } catch {
        // キャッシュできない場合は画面表示だけ更新する
    }
};

export default function MembersPage() {
    const [headers, setHeaders] = useState<string[]>([]);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [query, setQuery] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
    const [deletingMember, setDeletingMember] = useState<MemberRow | null>(
        null
    );
    const [createValues, setCreateValues] = useState<string[]>([]);
    const [editValues, setEditValues] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const applyMembersData = useCallback((data: MembersData) => {
        setHeaders(data.headers);
        setMembers(data.members);
        setMembersCache(data);
    }, []);

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/gas?path=members", {
                cache: "no-store",
            });
            const data = (await response.json()) as {
                success: boolean;
                data?: MembersData;
                error?: string;
            };

            if (!data.success || !data.data) {
                setError(data.error || "名簿の取得に失敗しました");
                return;
            }

            applyMembersData(data.data);
            setError(null);
        } catch (fetchError) {
            setError(
                fetchError instanceof Error
                    ? fetchError.message
                    : "名簿の取得に失敗しました"
            );
        } finally {
            setIsLoading(false);
        }
    }, [applyMembersData]);

    useEffect(() => {
        const cached = getMembersCache();
        if (cached) {
            setHeaders(cached.headers);
            setMembers(cached.members);
            setIsLoading(false);
            return;
        }

        void fetchMembers();
    }, [fetchMembers]);

    const filteredMembers = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return members;

        return members.filter((member) =>
            normalizeSearchTarget(member).includes(normalizedQuery)
        );
    }, [members, query]);

    const visibleColumnIndices = useMemo(
        () =>
            headers
                .map((header, index) => ({ header, index }))
                .filter(({ header }) => !isNameHeader(header))
                .map(({ index }) => index),
        [headers]
    );

    const nameColumnIndex = useMemo(
        () => headers.findIndex(isNameHeader),
        [headers]
    );

    const getDisplayCellValue = (
        member: MemberRow,
        header: string,
        index: number
    ): SheetCellValue => {
        const value = member.values[index];

        if (
            isNicknameHeader(header) &&
            stringifyCell(value).trim() === "---" &&
            nameColumnIndex >= 0
        ) {
            return member.values[nameColumnIndex];
        }

        return value;
    };

    const updateMembers = (nextMembers: MemberRow[]) => {
        const nextData = {
            headers,
            members: nextMembers,
        };
        applyMembersData(nextData);
    };

    const openCreateModal = () => {
        setCreateValues(headers.map(() => ""));
        setModalError(null);
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = (force = false) => {
        if (isSubmitting && !force) return;
        setIsCreateModalOpen(false);
        setCreateValues([]);
        setModalError(null);
    };

    const openEditModal = (member: MemberRow) => {
        setEditingMember(member);
        setEditValues(
            headers.map((_, index) => stringifyCell(member.values[index]))
        );
        setModalError(null);
    };

    const closeEditModal = (force = false) => {
        if (isSubmitting && !force) return;
        setEditingMember(null);
        setEditValues([]);
        setModalError(null);
    };

    const openDeleteModalFromEdit = () => {
        if (!editingMember) return;
        setDeletingMember(editingMember);
        setEditingMember(null);
        setEditValues([]);
        setModalError(null);
    };

    const closeDeleteModal = (force = false) => {
        if (isSubmitting && !force) return;
        setDeletingMember(null);
        setModalError(null);
    };

    const handleCreate = async () => {
        setIsSubmitting(true);
        setModalError(null);
        const values = normalizeEditableValues(createValues);

        try {
            const response = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ values }),
            });
            const data = await response.json();

            if (!data.success) {
                setModalError(data.error || "名簿の追加に失敗しました");
                return;
            }

            const newMember: MemberRow = {
                rowNumber: Number(data.rowNumber),
                values: Array.isArray(data.values) ? data.values : values,
            };

            updateMembers([...members, newMember]);
            closeCreateModal(true);
        } catch {
            setModalError("名簿の追加に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSave = async () => {
        if (!editingMember) return;

        setIsSubmitting(true);
        setModalError(null);
        const values = normalizeEditableValues(
            editValues,
            editingMember.values
        );

        try {
            const response = await fetch("/api/members", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rowNumber: editingMember.rowNumber,
                    values,
                }),
            });
            const data = await response.json();

            if (!data.success) {
                setModalError(data.error || "名簿の更新に失敗しました");
                return;
            }

            updateMembers(
                members.map((member) =>
                    member.rowNumber === editingMember.rowNumber
                        ? { ...member, values }
                        : member
                )
            );
            closeEditModal(true);
        } catch {
            setModalError("名簿の更新に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingMember) return;

        setIsSubmitting(true);
        setModalError(null);

        try {
            const response = await fetch("/api/members", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rowNumber: deletingMember.rowNumber }),
            });
            const data = await response.json();

            if (!data.success) {
                setModalError(data.error || "名簿の削除に失敗しました");
                return;
            }

            updateMembers(
                members
                    .filter(
                        (member) =>
                            member.rowNumber !== deletingMember.rowNumber
                    )
                    .map((member) =>
                        member.rowNumber > deletingMember.rowNumber
                            ? { ...member, rowNumber: member.rowNumber - 1 }
                            : member
                    )
            );
            closeDeleteModal(true);
        } catch {
            setModalError("名簿の削除に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 512"
                            className="size-6 text-primary"
                            fill="currentColor"
                        >
                            <path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H322.8c-3.1-8.8-3.7-18.4-1.4-27.8l15-60.1c2.8-11.3 8.6-21.5 16.8-29.7l40.3-40.3c-32.1-31-75.7-50.1-123.9-50.1H178.3zm435.5-68.3c-15.6-15.6-40.9-15.6-56.6 0l-29.4 29.4l71 71l29.4-29.4c15.6-15.6 15.6-40.9 0-56.6l-14.4-14.4zM375.9 417c-4.1 4.1-7 9.2-8.4 14.9l-15 60.1c-1.4 5.5 .2 11.2 4.2 15.2s9.7 5.6 15.2 4.2l60.1-15c5.6-1.4 10.8-4.3 14.9-8.4L576.1 358.7l-71-71L375.9 417z" />
                        </svg>
                        <div>
                            <h1 className="text-2xl font-bold">部員名簿</h1>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm gap-2"
                        onClick={openCreateModal}
                        disabled={isLoading || headers.length === 0}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                        追加
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <label className="input input-bordered flex items-center gap-2 w-full sm:max-w-md">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-4 opacity-60"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="search"
                            className="grow"
                            placeholder="名簿を検索"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </label>
                    <div className="stats stats-horizontal bg-base-50">
                        <div className="stat py-2 px-4">
                            <div className="stat-title text-sm">
                                表示:{filteredMembers.length}
                                </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>{error}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : (
                    <div className="border border-base-300 rounded-lg overflow-hidden w-full">
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-pin-rows w-full">
                            <thead>
                                <tr>
                                    {visibleColumnIndices.map((index) => (
                                        <th
                                            key={`${headers[index]}-${index}`}
                                            className="bg-base-200 text-base-content whitespace-nowrap"
                                        >
                                            {getHeaderLabel(headers[index])}
                                        </th>
                                    ))}
                                    <th className="w-28 bg-base-200 text-base-content">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map((member) => (
                                    <tr
                                        key={member.rowNumber}
                                        className="hover cursor-pointer"
                                        onClick={() => openEditModal(member)}
                                    >
                                        {visibleColumnIndices.map((index) => {
                                            const header = headers[index];
                                            const value = getDisplayCellValue(
                                                member,
                                                header,
                                                index
                                            );

                                            return (
                                                <td
                                                    key={`${member.rowNumber}-${header}-${index}`}
                                                    className="max-w-48 whitespace-pre-wrap break-words"
                                                >
                                                    {isBooleanCell(value) ? (
                                                        <BooleanToggle
                                                            checked={getBooleanCellValue(
                                                                value
                                                            )}
                                                            readOnly
                                                        />
                                                    ) : (
                                                        stringifyCell(value)
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="text-right">
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-outline btn-sm gap-2 whitespace-nowrap"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditModal(member);
                                                }}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="size-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                                    />
                                                </svg>
                                                編集
                                            </button>
                                        </td>
                                    </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={
                                                visibleColumnIndices.length + 1
                                            }
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
                                                        d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 100-8 4 4 0 000 8zm6 4a3 3 0 10-2.83-4M6.83 12A3 3 0 104 16"
                                                    />
                                                </svg>
                                                該当する名簿データがありません
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                <dialog
                    className="modal modal-open"
                    onClose={() => closeCreateModal()}
                >
                    <div className="modal-box max-w-4xl p-0 overflow-hidden">
                        <div className="bg-base-200 px-6 py-5">
                            <h2 className="font-bold text-lg">名簿に追加</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[62vh] overflow-y-auto p-6">
                            {headers.map((header, index) => (
                                <MemberField
                                    key={`${header}-${index}`}
                                    label={getHeaderLabel(header)}
                                    value={createValues[index] || ""}
                                    onChange={(value) => {
                                        const nextValues = [...createValues];
                                        nextValues[index] = value;
                                        setCreateValues(nextValues);
                                    }}
                                />
                            ))}
                        </div>

                        {modalError && (
                            <div className="alert alert-error mx-6 mb-4">
                                <span>{modalError}</span>
                            </div>
                        )}

                        <div className="modal-action bg-base-100 border-t border-base-300 m-0 px-6 py-4">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => closeCreateModal()}
                                disabled={isSubmitting}
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => void handleCreate()}
                                disabled={isSubmitting}
                            >
                                {isSubmitting && (
                                    <span className="loading loading-spinner loading-sm" />
                                )}
                                追加
                            </button>
                        </div>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                    >
                        <button
                            type="button"
                            onClick={() => closeCreateModal()}
                        >
                            close
                        </button>
                    </form>
                </dialog>
            )}

            {editingMember && (
                <dialog
                    className="modal modal-open"
                    onClose={() => closeEditModal()}
                >
                    <div className="modal-box max-w-4xl p-0 overflow-hidden">
                        <div className="bg-base-200 px-6 py-5">
                            <h2 className="font-bold text-lg">編集</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[62vh] overflow-y-auto p-6">
                            {headers.map((header, index) => (
                                <MemberField
                                    key={`${header}-${index}`}
                                    label={getHeaderLabel(header)}
                                    value={editValues[index] || ""}
                                    sourceValue={editingMember.values[index]}
                                    onChange={(value) => {
                                        const nextValues = [...editValues];
                                        nextValues[index] = value;
                                        setEditValues(nextValues);
                                    }}
                                />
                            ))}
                        </div>

                        {modalError && (
                            <div className="alert alert-error mx-6 mb-4">
                                <span>{modalError}</span>
                            </div>
                        )}

                        <div className="modal-action justify-between bg-base-100 border-t border-base-300 m-0 px-6 py-4">
                            <button
                                type="button"
                                className="btn btn-error btn-outline"
                                onClick={openDeleteModalFromEdit}
                                disabled={isSubmitting}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="size-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                    />
                                </svg>
                                削除
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => closeEditModal()}
                                    disabled={isSubmitting}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => void handleSave()}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && (
                                        <span className="loading loading-spinner loading-sm" />
                                    )}
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                    >
                        <button
                            type="button"
                            onClick={() => closeEditModal()}
                        >
                            close
                        </button>
                    </form>
                </dialog>
            )}

            {deletingMember && (
                <dialog
                    className="modal modal-open"
                    onClose={() => closeDeleteModal()}
                >
                    <div className="modal-box">
                        <h2 className="font-bold text-lg">名簿から削除</h2>
                        <p className="mt-3">
                            {getPrimaryValue(deletingMember, headers)}
                            を削除します。
                        </p>

                        {modalError && (
                            <div className="alert alert-error mt-4">
                                <span>{modalError}</span>
                            </div>
                        )}

                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => closeDeleteModal()}
                                disabled={isSubmitting}
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                className="btn btn-error"
                                onClick={() => void handleDelete()}
                                disabled={isSubmitting}
                            >
                                {isSubmitting && (
                                    <span className="loading loading-spinner loading-sm" />
                                )}
                                削除
                            </button>
                        </div>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                    >
                        <button
                            type="button"
                            onClick={() => closeDeleteModal()}
                        >
                            close
                        </button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
