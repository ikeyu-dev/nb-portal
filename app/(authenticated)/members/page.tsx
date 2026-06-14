"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCircleCheck,
    faMagnifyingGlass,
    faPen,
    faPlus,
    faTrashCan,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
import {
    MEMBER_PERMISSION_LABELS,
    MEMBER_PERMISSIONS,
} from "@/src/shared/types/api";
import type {
    ApiResponse,
    MemberRow,
    MembersData,
    SheetCellValue,
} from "@/src/shared/types/api";
import {
    getClientCacheEntry,
    getStaleClientCacheEntry,
    setClientCache,
} from "@/src/shared/lib/client-cache";
import {
    CACHE_TTL_MS,
    CLIENT_CACHE_KEYS,
} from "@/src/shared/lib/cache-policy";

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

const getBooleanStatusLabel = (checked: boolean): string =>
    checked ? "済" : "未";

const normalizeEditableValues = (
    values: string[],
    headers: string[],
    sourceValues: SheetCellValue[] = []
): Array<string | boolean> =>
    values.map((value, index) => {
        if (isPermissionHeader(headers[index]) && value.trim() === "") {
            return "TMP_NORMAL";
        }

        return isBooleanHeader(headers[index]) ||
            isBooleanCell(sourceValues[index] ?? value)
            ? getBooleanCellValue(value)
            : value;
    });

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
    header,
    label,
    value,
    sourceValue,
    onChange,
}: {
    header: string;
    label: string;
    value: string;
    sourceValue?: SheetCellValue;
    onChange: (value: string) => void;
}) {
    const isPermission = isPermissionHeader(header);
    const isBoolean =
        isBooleanHeader(header) || isBooleanCell(sourceValue ?? value);
    const shouldUseTextarea = value.includes("\n") || value.length > 60;

    return (
        <div className="form-control rounded-lg border border-base-300 bg-base-100 p-4">
            <div className="label pt-0">
                <span className="label-text font-medium">{label}</span>
            </div>
            {isPermission ? (
                <select
                    className="select select-bordered w-full"
                    value={value || "TMP_NORMAL"}
                    onChange={(event) => onChange(event.target.value)}
                >
                    {MEMBER_PERMISSIONS.map((permission) => (
                        <option
                            key={permission}
                            value={permission}
                        >
                            {MEMBER_PERMISSION_LABELS[permission]}
                        </option>
                    ))}
                </select>
            ) : isBoolean ? (
                <div className="flex items-center justify-between rounded-lg bg-base-200 px-4 py-3">
                    <span className="text-sm text-base-content/70">
                        {getBooleanStatusLabel(getBooleanCellValue(value))}
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

const isStudentNumberHeader = (header: string): boolean =>
    header.trim().toLowerCase() === "studentnumber";

const isNicknameHeader = (header: string): boolean =>
    header.trim().toLowerCase() === "nickname";

const isLineNameHeader = (header: string): boolean =>
    header.trim().toLowerCase() === "linename";

const isPermissionHeader = (header: string): boolean =>
    header.trim().toLowerCase() === "permission";

const isBooleanHeader = (header: string): boolean =>
    header.trim().toLowerCase().startsWith("is");

const getAdmissionYear = (studentNumber: SheetCellValue): string | null => {
    const value = stringifyCell(studentNumber).trim();
    const yearFragment = value.slice(1, 3);

    if (!/^\d{2}$/.test(yearFragment)) return null;
    return `20${yearFragment}`;
};

export default function MembersPage() {
    const [headers, setHeaders] = useState<string[]>([]);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [query, setQuery] = useState("");
    const [selectedAdmissionYear, setSelectedAdmissionYear] = useState("all");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCheckedListModalOpen, setIsCheckedListModalOpen] =
        useState(false);
    const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
    const [deletingMember, setDeletingMember] = useState<MemberRow | null>(
        null
    );
    const [createValues, setCreateValues] = useState<string[]>([]);
    const [editValues, setEditValues] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [lineNameCopyStatus, setLineNameCopyStatus] = useState<
        "idle" | "copied" | "failed"
    >("idle");
    const [checkedMemberRows, setCheckedMemberRows] = useState<Set<number>>(
        () => new Set()
    );
    const lineNameCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    const applyMembersData = useCallback((data: MembersData) => {
        setHeaders(data.headers);
        setMembers(data.members);
    }, []);

    const fetchMembers = useCallback(async () => {
        const cached = getClientCacheEntry<MembersData>(
            CLIENT_CACHE_KEYS.members,
            CACHE_TTL_MS.pageData
        );
        if (cached) {
            applyMembersData(cached.data);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await fetch("/api/backend?path=members", {
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
            setClientCache(CLIENT_CACHE_KEYS.members, data.data);
            setError(null);
        } catch (fetchError) {
            const stale = getStaleClientCacheEntry<MembersData>(
                CLIENT_CACHE_KEYS.members,
                { maxAgeMs: CACHE_TTL_MS.stalePageData }
            );
            if (stale) {
                applyMembersData(stale.data);
            } else {
                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "名簿の取得に失敗しました"
                );
            }
        } finally {
            setIsLoading(false);
        }
    }, [applyMembersData]);

    useEffect(() => {
        void fetchMembers();
    }, [fetchMembers]);

    useEffect(
        () => () => {
            if (lineNameCopyTimerRef.current) {
                clearTimeout(lineNameCopyTimerRef.current);
            }
        },
        []
    );

    const studentNumberColumnIndex = useMemo(
        () => headers.findIndex(isStudentNumberHeader),
        [headers]
    );

    const lineNameColumnIndex = useMemo(
        () => headers.findIndex(isLineNameHeader),
        [headers]
    );

    const visibleColumnIndices = useMemo(
        () =>
            [
                headers.findIndex(isStudentNumberHeader),
                headers.findIndex(isNicknameHeader),
                headers.findIndex(isNameHeader),
                headers.findIndex(isLineNameHeader),
            ].filter((index) => index >= 0),
        [headers]
    );

    const admissionYears = useMemo(() => {
        if (studentNumberColumnIndex < 0) return [];

        return Array.from(
            new Set(
                members
                    .map((member) =>
                        getAdmissionYear(
                            member.values[studentNumberColumnIndex]
                        )
                    )
                    .filter((year): year is string => Boolean(year))
            )
        ).sort((a, b) => Number(b) - Number(a));
    }, [members, studentNumberColumnIndex]);

    const filteredMembers = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return members.filter((member) => {
            const matchesQuery =
                !normalizedQuery ||
                normalizeSearchTarget(member).includes(normalizedQuery);
            const matchesAdmissionYear =
                selectedAdmissionYear === "all" ||
                studentNumberColumnIndex < 0 ||
                getAdmissionYear(member.values[studentNumberColumnIndex]) ===
                    selectedAdmissionYear;

            return matchesQuery && matchesAdmissionYear;
        });
    }, [members, query, selectedAdmissionYear, studentNumberColumnIndex]);

    const checkedMembers = useMemo(
        () =>
            members.filter((member) =>
                checkedMemberRows.has(member.rowNumber)
            ),
        [checkedMemberRows, members]
    );

    const checkedLineNames = useMemo(() => {
        if (lineNameColumnIndex < 0) return [];

        return checkedMembers
            .map((member) => stringifyCell(member.values[lineNameColumnIndex]))
            .map((lineName) => lineName.trim())
            .filter((lineName) => lineName !== "")
            .map((lineName) =>
                lineName.startsWith("@") ? lineName : `@${lineName}`
            );
    }, [checkedMembers, lineNameColumnIndex]);

    const hasActiveFilters =
        query.trim() !== "" ||
        selectedAdmissionYear !== "all" ||
        checkedMemberRows.size > 0;

    const clearFilters = () => {
        setQuery("");
        setSelectedAdmissionYear("all");
        setCheckedMemberRows(new Set());
    };

    const toggleMemberCheck = (rowNumber: number, checked: boolean) => {
        setCheckedMemberRows((currentRows) => {
            const nextRows = new Set(currentRows);

            if (checked) {
                nextRows.add(rowNumber);
            } else {
                nextRows.delete(rowNumber);
            }

            return nextRows;
        });
    };

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
        setClientCache(CLIENT_CACHE_KEYS.members, nextData);
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

    const closeCheckedListModal = () => {
        setIsCheckedListModalOpen(false);
        setLineNameCopyStatus("idle");
    };

    const copyCheckedLineNames = async () => {
        if (checkedLineNames.length === 0) return;

        if (lineNameCopyTimerRef.current) {
            clearTimeout(lineNameCopyTimerRef.current);
        }

        try {
            await navigator.clipboard.writeText(checkedLineNames.join(" "));
            setLineNameCopyStatus("copied");
        } catch {
            setLineNameCopyStatus("failed");
        }

        lineNameCopyTimerRef.current = setTimeout(() => {
            setLineNameCopyStatus("idle");
            lineNameCopyTimerRef.current = null;
        }, 1000);
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
        const values = normalizeEditableValues(createValues, headers);

        try {
            const response = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ values }),
            });
            const data = (await response.json()) as ApiResponse<null> & {
                rowNumber?: number;
                values?: SheetCellValue[];
            };

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
            headers,
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
            const data = (await response.json()) as ApiResponse<null>;

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
            const data = (await response.json()) as ApiResponse<null>;

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
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <FontAwesomeIcon
                            icon={faUsers}
                            className="text-2xl text-primary"
                        />
                        <div>
                            <h1 className="text-2xl font-bold">部員名簿</h1>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn btn-outline btn-sm gap-2"
                            onClick={() => setIsCheckedListModalOpen(true)}
                            disabled={isLoading || checkedMembers.length === 0}
                        >
                            <FontAwesomeIcon
                                icon={faCircleCheck}
                                className="text-lg"
                            />
                            チェック済み
                            {checkedMembers.length > 0 && (
                                <span className="badge badge-primary badge-sm">
                                    {checkedMembers.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-2"
                            onClick={openCreateModal}
                            disabled={isLoading || headers.length === 0}
                        >
                            <FontAwesomeIcon
                                icon={faPlus}
                                className="text-lg"
                            />
                            追加
                        </button>
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
                    <div className="rounded-lg border border-base-300 bg-base-100 overflow-hidden w-full">
                        <div className="border-b border-base-300 bg-base-50 p-3 sm:p-4">
                            <div className="grid grid-cols-1 items-end gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_16rem_auto_auto]">
                                <label className="form-control w-full">
                                    <span className="label-text mb-1 hidden text-sm sm:inline">
                                        検索
                                    </span>
                                    <div className="input input-bordered input-sm flex items-center gap-2 bg-base-100 sm:input-md">
                                        <FontAwesomeIcon
                                            icon={faMagnifyingGlass}
                                            className="text-lg opacity-60"
                                        />
                                        <input
                                            type="search"
                                            className="grow"
                                            placeholder="検索"
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                        />
                                    </div>
                                </label>
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:contents">
                                <label className="form-control w-full">
                                    <span className="label-text mb-1 hidden text-sm sm:inline">
                                        入学年度
                                    </span>
                                    <select
                                        className="select select-bordered select-sm w-full bg-base-100 sm:select-md"
                                        value={selectedAdmissionYear}
                                        onChange={(event) =>
                                            setSelectedAdmissionYear(
                                                event.target.value
                                            )
                                        }
                                    >
                                        <option value="all">すべて</option>
                                        {admissionYears.map((year) => (
                                            <option
                                                key={year}
                                                value={year}
                                            >
                                                {year}年度
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="hidden h-12 items-center justify-center rounded-lg border border-base-300 bg-base-100 px-4 text-sm text-base-content/70 lg:flex">
                                    {filteredMembers.length} / {members.length}件
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm sm:btn-md"
                                    onClick={clearFilters}
                                    disabled={!hasActiveFilters}
                                >
                                    クリア
                                </button>
                                </div>
                            </div>
                            <div className="mt-2 text-right text-xs text-base-content/60 lg:hidden">
                                {filteredMembers.length} / {members.length}件
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table table-zebra table-pin-rows table-fixed min-w-[38rem] w-full">
                            <colgroup>
                                <col className="w-12 sm:w-14" />
                                <col className="w-28 sm:w-36" />
                                <col className="w-32 sm:w-48" />
                                <col className="w-32 sm:w-44" />
                                <col className="w-32 sm:w-48" />
                                <col className="w-16 sm:w-20" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th
                                        className="bg-base-200 text-base-content"
                                        aria-label="チェック"
                                    />
                                    {visibleColumnIndices.map((index) => (
                                        <th
                                            key={`${headers[index]}-${index}`}
                                            className="bg-base-200 text-base-content whitespace-nowrap"
                                        >
                                            {getHeaderLabel(headers[index])}
                                        </th>
                                    ))}
                                    <th className="w-28 bg-base-200 text-right text-base-content">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map((member) => (
                                    <tr
                                        key={member.rowNumber}
                                        className="hover cursor-pointer align-middle"
                                        onClick={() => openEditModal(member)}
                                    >
                                        <td
                                            className="py-4 text-center"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary checkbox-md"
                                                checked={checkedMemberRows.has(
                                                    member.rowNumber
                                                )}
                                                aria-label={`${getPrimaryValue(
                                                    member,
                                                    headers
                                                )}をチェック`}
                                                onChange={(event) =>
                                                    toggleMemberCheck(
                                                        member.rowNumber,
                                                        event.target.checked
                                                    )
                                                }
                                            />
                                        </td>
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
                                                    className="py-4"
                                                >
                                                    {isBooleanCell(value) ? (
                                                        <BooleanToggle
                                                            checked={getBooleanCellValue(
                                                                value
                                                            )}
                                                            readOnly
                                                        />
                                                    ) : isStudentNumberHeader(
                                                          header
                                                      ) ? (
                                                        <span className="block truncate font-mono text-sm">
                                                            {stringifyCell(
                                                                value
                                                            )}
                                                        </span>
                                                    ) : isNicknameHeader(
                                                          header
                                                      ) ? (
                                                        <span className="block truncate font-medium">
                                                            {stringifyCell(
                                                                value
                                                            )}
                                                        </span>
                                                    ) : isNameHeader(header) ? (
                                                        <span className="block truncate">
                                                            {stringifyCell(
                                                                value
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="block truncate">
                                                            {stringifyCell(
                                                                value
                                                            )}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="py-4 text-right">
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-outline btn-sm whitespace-nowrap"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditModal(member);
                                                }}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faPen}
                                                    className="text-lg"
                                                />
                                            </button>
                                        </td>
                                    </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={
                                                visibleColumnIndices.length + 2
                                            }
                                            className="text-center text-base-content/60 py-8"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <FontAwesomeIcon
                                                    icon={faUsers}
                                                    className="text-5xl text-base-content/30"
                                                />
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
                    <div className="modal-box max-w-xl p-0 overflow-hidden">
                        <div className="bg-base-200 px-6 py-5">
                            <h2 className="font-bold text-lg">名簿に追加</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4 max-h-[62vh] overflow-y-auto p-6">
                            {headers.map((header, index) => (
                                <MemberField
                                    key={`${header}-${index}`}
                                    header={header}
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
                            閉じる
                        </button>
                    </form>
                </dialog>
            )}

            {isCheckedListModalOpen && (
                <dialog
                    className="modal modal-open"
                    onClose={closeCheckedListModal}
                >
                    <div className="modal-box max-w-2xl p-0 overflow-hidden">
                        <div className="bg-base-200 px-6 py-5">
                            <h2 className="font-bold text-lg">
                                チェック済み部員
                            </h2>
                            <p className="mt-1 text-sm text-base-content/70">
                                {checkedMembers.length}名
                            </p>
                        </div>

                        <div className="max-h-[62vh] overflow-y-auto p-4 sm:p-6">
                            {checkedMembers.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-base-300">
                                    <table className="table table-zebra table-sm w-full">
                                        <thead>
                                            <tr>
                                                {visibleColumnIndices.map(
                                                    (index) => (
                                                        <th
                                                            key={`${headers[index]}-${index}-checked`}
                                                            className="whitespace-nowrap bg-base-200"
                                                        >
                                                            {getHeaderLabel(
                                                                headers[index]
                                                            )}
                                                        </th>
                                                    )
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checkedMembers.map((member) => (
                                                <tr key={member.rowNumber}>
                                                    {visibleColumnIndices.map(
                                                        (index) => {
                                                            const header =
                                                                headers[index];
                                                            const value =
                                                                getDisplayCellValue(
                                                                    member,
                                                                    header,
                                                                    index
                                                                );

                                                            return (
                                                                <td
                                                                    key={`${member.rowNumber}-${header}-${index}-checked`}
                                                                >
                                                                    <span
                                                                        className={`block truncate ${
                                                                            isStudentNumberHeader(
                                                                                header
                                                                            )
                                                                                ? "font-mono text-sm"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        {isBooleanCell(
                                                                            value
                                                                        )
                                                                            ? getBooleanStatusLabel(
                                                                                  getBooleanCellValue(
                                                                                      value
                                                                                  )
                                                                              )
                                                                            : stringifyCell(
                                                                                  value
                                                                              )}
                                                                    </span>
                                                                </td>
                                                            );
                                                        }
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-base-content/60">
                                    チェック済みの部員はいません
                                </div>
                            )}
                        </div>

                        <div className="modal-action bg-base-100 border-t border-base-300 m-0 px-6 py-4">
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => void copyCheckedLineNames()}
                                    disabled={checkedLineNames.length === 0}
                                >
                                    {lineNameCopyStatus === "copied"
                                        ? "コピー済み"
                                        : lineNameCopyStatus === "failed"
                                          ? "失敗"
                                          : "LINE名コピー"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={closeCheckedListModal}
                                >
                                    閉じる
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
                            onClick={closeCheckedListModal}
                        >
                            閉じる
                        </button>
                    </form>
                </dialog>
            )}

            {editingMember && (
                <dialog
                    className="modal modal-open"
                    onClose={() => closeEditModal()}
                >
                    <div className="modal-box max-w-xl p-0 overflow-hidden">
                        <div className="bg-base-200 px-6 py-5">
                            <h2 className="font-bold text-lg">編集</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4 max-h-[62vh] overflow-y-auto p-6">
                            {headers.map((header, index) => (
                                <MemberField
                                    key={`${header}-${index}`}
                                    header={header}
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
                                <FontAwesomeIcon
                                    icon={faTrashCan}
                                    className="text-lg"
                                />
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
                            閉じる
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
                            閉じる
                        </button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
