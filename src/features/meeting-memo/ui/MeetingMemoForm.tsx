"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCirclePlus,
    faTrashCan,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
    CACHE_TTL_MS,
    CLIENT_CACHE_KEYS,
} from "@/src/shared/lib/cache-policy";
import {
    getClientCache,
    setClientCache,
} from "@/src/shared/lib/client-cache";
import {
    formatJstDateInput,
    parseDateInput,
} from "@/src/shared/lib/jst-date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
const LOCATIONS = ["Discord", "クラブ棟前", "部室", "その他"] as const;
const SECTION_CLASS = "space-y-4 border-b border-base-300 px-2 pb-8 sm:px-4";
const FIELD_LABEL_CLASS = "block text-sm font-medium text-base-content/70";
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface ScheduleItem {
    id: string;
    title: string;
    details?: string;
    detailBlocks: ScheduleDetailBlock[];
}

interface ScheduleDetailBlock {
    id: string;
    heading: string;
    body: string;
}

interface MemoFormData {
    date: string;
    time: string;
    location: string;
    customLocation: string;
    scheduleItems: ScheduleItem[];
    accountingNote: string;
    bundanNote: string;
    otherNote: string;
    nextMeetingDate: string;
    nextMeetingTime: string;
    nextMeetingLocation: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createDefaultFormData = (): MemoFormData => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
        date: formatJstDateInput(today),
        time: "21:00",
        location: "Discord",
        customLocation: "",
        scheduleItems: [
            {
                id: generateId(),
                title: "",
                detailBlocks: [{ id: generateId(), heading: "", body: "" }],
            },
        ],
        accountingNote: "@部費滞納者\n計画的に部費の支払いをお願いします",
        bundanNote: "特になし",
        otherNote: "",
        nextMeetingDate: formatJstDateInput(nextWeek),
        nextMeetingTime: "21:00",
        nextMeetingLocation: "Discord",
    };
};

const normalizeDraft = (draft: Partial<MemoFormData>): MemoFormData => {
    const defaults = createDefaultFormData();
    const scheduleItems =
        Array.isArray(draft.scheduleItems) &&
        draft.scheduleItems.some(
            (item) =>
                item &&
                typeof item.id === "string" &&
                typeof item.title === "string" &&
                (typeof item.details === "string" ||
                    Array.isArray(item.detailBlocks))
        )
            ? draft.scheduleItems
                  .filter(
                      (item): item is ScheduleItem =>
                          !!item &&
                          typeof item.id === "string" &&
                          typeof item.title === "string" &&
                          (typeof item.details === "string" ||
                              Array.isArray(item.detailBlocks))
                  )
                  .map((item) => ({
                      id: item.id || generateId(),
                      title: item.title,
                      detailBlocks:
                          Array.isArray(item.detailBlocks) &&
                          item.detailBlocks.some(
                              (block) =>
                                  block &&
                                  typeof block.id === "string" &&
                                  typeof block.heading === "string" &&
                                  typeof block.body === "string"
                          )
                              ? item.detailBlocks
                                    .filter(
                                        (
                                            block
                                        ): block is ScheduleDetailBlock =>
                                            !!block &&
                                            typeof block.id === "string" &&
                                            typeof block.heading ===
                                                "string" &&
                                            typeof block.body === "string"
                                    )
                                    .map((block) => ({
                                        id: block.id || generateId(),
                                        heading: block.heading,
                                        body: block.body,
                                    }))
                              : [
                                    {
                                        id: generateId(),
                                        heading: "",
                                        body:
                                            typeof item.details === "string"
                                                ? item.details
                                                : "",
                                    },
                                ],
                  }))
            : defaults.scheduleItems;

    return {
        date: typeof draft.date === "string" ? draft.date : defaults.date,
        time: typeof draft.time === "string" ? draft.time : defaults.time,
        location:
            typeof draft.location === "string"
                ? draft.location
                : defaults.location,
        customLocation:
            typeof draft.customLocation === "string"
                ? draft.customLocation
                : defaults.customLocation,
        scheduleItems,
        accountingNote:
            typeof draft.accountingNote === "string"
                ? draft.accountingNote
                : defaults.accountingNote,
        bundanNote:
            typeof draft.bundanNote === "string"
                ? draft.bundanNote
                : defaults.bundanNote,
        otherNote:
            typeof draft.otherNote === "string"
                ? draft.otherNote
                : defaults.otherNote,
        nextMeetingDate:
            typeof draft.nextMeetingDate === "string"
                ? draft.nextMeetingDate
                : defaults.nextMeetingDate,
        nextMeetingTime:
            typeof draft.nextMeetingTime === "string"
                ? draft.nextMeetingTime
                : defaults.nextMeetingTime,
        nextMeetingLocation:
            typeof draft.nextMeetingLocation === "string"
                ? draft.nextMeetingLocation
                : defaults.nextMeetingLocation,
    };
};

const formatScheduleDetailBlock = (
    block: ScheduleDetailBlock,
    formatHeading: (value: string) => string
) => {
    const heading = block.heading.trim()
        ? formatHeading(block.heading.trim())
        : "";
    const bodyLines = block.body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const body = bodyLines.map((line) => `    - ${line}`).join("\n");

    if (heading && body) return `  - **${heading}**\n${body}`;
    if (heading) return `  - **${heading}**`;
    if (body) return body;
    return "";
};

const hasScheduleItemContent = (item: ScheduleItem) =>
    item.title.trim() &&
    item.detailBlocks.some(
        (block) => block.heading.trim() || block.body.trim()
    );

/**
 * 部会メモ作成フォームコンポーネント
 */
export function MeetingMemoForm() {
    const [formData, setFormData] = useState<MemoFormData>(createDefaultFormData);
    const hasRestoredDraftRef = useRef(false);
    const shouldSkipInitialPersistRef = useRef(true);

    const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
        "idle"
    );

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const draft = getClientCache<Partial<MemoFormData>>(
                CLIENT_CACHE_KEYS.meetingMemoDraft,
                CACHE_TTL_MS.meetingMemoDraft
            );
            if (!draft) return;

            setFormData(normalizeDraft(draft));
        } catch {
            // 壊れた下書きは client-cache.ts のキャッシュヘルパー側で破棄される
        } finally {
            hasRestoredDraftRef.current = true;
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !hasRestoredDraftRef.current) {
            return;
        }

        if (shouldSkipInitialPersistRef.current) {
            shouldSkipInitialPersistRef.current = false;
            return;
        }

        try {
            setClientCache(
                CLIENT_CACHE_KEYS.meetingMemoDraft,
                formData
            );
        } catch {
            // 保存できない場合は無視
        }
    }, [formData]);

    const formatDate = (dateStr: string): string => {
        const date = parseDateInput(dateStr);
        if (!date) return dateStr;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = WEEKDAYS[date.getDay()];
        return `${month}/${day}(${weekday})`;
    };

    const addScheduleItem = () => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: [
                ...prev.scheduleItems,
                {
                    id: generateId(),
                    title: "",
                    detailBlocks: [{ id: generateId(), heading: "", body: "" }],
                },
            ],
        }));
    };

    const removeScheduleItem = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: prev.scheduleItems.filter((item) => item.id !== id),
        }));
    };

    const updateScheduleItem = (
        id: string,
        field: "title",
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: prev.scheduleItems.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            ),
        }));
    };

    const addScheduleDetailBlock = (scheduleItemId: string) => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: prev.scheduleItems.map((item) =>
                item.id === scheduleItemId
                    ? {
                          ...item,
                          detailBlocks: [
                              ...item.detailBlocks,
                              { id: generateId(), heading: "", body: "" },
                          ],
                      }
                    : item
            ),
        }));
    };

    const removeScheduleDetailBlock = (
        scheduleItemId: string,
        detailBlockId: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: prev.scheduleItems.map((item) =>
                item.id === scheduleItemId
                    ? {
                          ...item,
                          detailBlocks: item.detailBlocks.filter(
                              (block) => block.id !== detailBlockId
                          ),
                      }
                    : item
            ),
        }));
    };

    const updateScheduleDetailBlock = (
        scheduleItemId: string,
        detailBlockId: string,
        field: "heading" | "body",
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: prev.scheduleItems.map((item) =>
                item.id === scheduleItemId
                    ? {
                          ...item,
                          detailBlocks: item.detailBlocks.map((block) =>
                              block.id === detailBlockId
                                  ? { ...block, [field]: value }
                                  : block
                          ),
                      }
                    : item
            ),
        }));
    };

    const generateMarkdown = useCallback((): string => {
        const location =
            formData.location === "その他"
                ? formData.customLocation
                : formData.location;
        const header = `## ${formatDate(formData.date)} ${
            formData.time
        }- 部会@${location}`;

        const scheduleSection =
            formData.scheduleItems.filter(hasScheduleItemContent).length >
            0
                ? `### ◯ 今後の予定\n\n${formData.scheduleItems
                      .filter(hasScheduleItemContent)
                      .map((item) => {
                          const titleLine = `- **${item.title.trim()}**`;
                          const detailBlocks = item.detailBlocks
                              .map((block) =>
                                  formatScheduleDetailBlock(block, formatDate)
                              )
                              .filter(Boolean)
                              .join("\n");
                          if (!detailBlocks) return titleLine;
                          return `${titleLine}\n${detailBlocks}`;
                      })
                      .join("\n\n")}`
                : "";

        const accountingSection = formData.accountingNote.trim()
            ? `**◯ 会計**\n\n${formData.accountingNote}`
            : "";

        const bunkouSection = `**◯ 文団**\n\n${
            formData.bundanNote || "特になし"
        }`;

        const otherSection = formData.otherNote.trim()
            ? `**◯ その他**\n\n${formData.otherNote}`
            : "";

        const nextMeetingLocation =
            formData.nextMeetingLocation === "その他"
                ? formData.customLocation
                : formData.nextMeetingLocation;
        const nextMeetingSection = `**次回部会**\n\n**${formatDate(
            formData.nextMeetingDate
        )} ${formData.nextMeetingTime}- 部会@${nextMeetingLocation}**`;

        const sections = [
            header,
            scheduleSection,
            accountingSection,
            bunkouSection,
            otherSection,
            nextMeetingSection,
        ].filter(Boolean);

        return sections.join("\n\n");
    }, [formData]);

    const handleCopy = async () => {
        try {
            const markdown = generateMarkdown();
            await navigator.clipboard.writeText(markdown);
            setCopyStatus("success");
            setTimeout(() => setCopyStatus("idle"), 2000);
        } catch {
            setCopyStatus("error");
            setTimeout(() => setCopyStatus("idle"), 2000);
        }
    };

    return (
        <div className="space-y-6">
            <section className={SECTION_CLASS}>
                <h3 className="text-base font-semibold">基本情報</h3>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
                    <div className="space-y-2">
                        <label className={FIELD_LABEL_CLASS}>日付</label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={formData.date}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    date: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={FIELD_LABEL_CLASS}>開始時刻</label>
                        <input
                            type="time"
                            className="input input-bordered w-full"
                            value={formData.time}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    time: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="space-y-2 [grid-column:1/-1]">
                        <label className={FIELD_LABEL_CLASS}>場所</label>
                        <div className="flex flex-wrap gap-2">
                            {LOCATIONS.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    className={`btn btn-sm ${
                                        formData.location === loc
                                            ? "btn-primary"
                                            : "btn-outline"
                                    }`}
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            location: loc,
                                        })
                                    }
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                        {formData.location === "その他" && (
                            <input
                                type="text"
                                className="input input-bordered mt-2"
                                placeholder="場所を入力"
                                value={formData.customLocation}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        customLocation: e.target.value,
                                    })
                                }
                            />
                        )}
                    </div>
                </div>
            </section>

            <section className={SECTION_CLASS}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">今後の予定</h3>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm shrink-0 gap-2"
                        onClick={addScheduleItem}
                    >
                        <FontAwesomeIcon icon={faCirclePlus} />
                        イベントを追加
                    </button>
                </div>
                <div className="divide-y divide-base-300">
                    {formData.scheduleItems.map((item, index) => (
                        <div
                            key={item.id}
                            className="py-4 first:pt-0 last:pb-0"
                        >
                            <div className="flex items-end gap-2">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <label className={FIELD_LABEL_CLASS}>
                                        イベント {index + 1}（必須）
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="音団講習会"
                                        value={item.title}
                                        onChange={(e) =>
                                            updateScheduleItem(
                                                item.id,
                                                "title",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                                {formData.scheduleItems.length > 1 && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm mb-1 shrink-0 text-error"
                                        onClick={() =>
                                            removeScheduleItem(item.id)
                                        }
                                        aria-label={`イベント ${
                                            index + 1
                                        } を削除`}
                                    >
                                        <FontAwesomeIcon icon={faTrashCan} />
                                    </button>
                                )}
                            </div>
                            <div className="mt-3 divide-y divide-base-300/70">
                                {item.detailBlocks.map(
                                    (detailBlock, detailIndex) => (
                                        <div
                                            key={detailBlock.id}
                                            className="py-3 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div className="flex flex-wrap gap-2">
                                                        <label className="space-y-2 flex-[1_1_10rem]">
                                                            <span
                                                                className={
                                                                    FIELD_LABEL_CLASS
                                                                }
                                                            >
                                                                日程{" "}
                                                                {detailIndex +
                                                                    1}
                                                            </span>
                                                            <input
                                                                type="date"
                                                                className="input input-bordered input-sm w-full"
                                                                value={
                                                                    DATE_INPUT_PATTERN.test(
                                                                        detailBlock.heading
                                                                    )
                                                                        ? detailBlock.heading
                                                                        : ""
                                                                }
                                                                onChange={(e) =>
                                                                    updateScheduleDetailBlock(
                                                                        item.id,
                                                                        detailBlock.id,
                                                                        "heading",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                        <label className="min-w-0 space-y-2 flex-[999_1_24rem]">
                                                            <span
                                                                className={
                                                                    FIELD_LABEL_CLASS
                                                                }
                                                            >
                                                                連絡内容
                                                            </span>
                                                            <textarea
                                                                className="textarea textarea-bordered textarea-sm min-h-20 w-full text-sm"
                                                                placeholder={
                                                                    "集合: 17:00 クラブ棟前\n内容: 機材搬入、物品搬出"
                                                                }
                                                                rows={3}
                                                                value={
                                                                    detailBlock.body
                                                                }
                                                                onChange={(e) =>
                                                                    updateScheduleDetailBlock(
                                                                        item.id,
                                                                        detailBlock.id,
                                                                        "body",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                                {item.detailBlocks.length >
                                                    1 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm shrink-0 text-error"
                                                        onClick={() =>
                                                            removeScheduleDetailBlock(
                                                                item.id,
                                                                detailBlock.id
                                                            )
                                                        }
                                                        aria-label="詳細を削除"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faXmark}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm mt-2 gap-2"
                                onClick={() => addScheduleDetailBlock(item.id)}
                            >
                                <FontAwesomeIcon icon={faCirclePlus} />
                                日程を追加
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section className={SECTION_CLASS}>
                <h3 className="text-base font-semibold">会計</h3>
                <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    value={formData.accountingNote}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            accountingNote: e.target.value,
                        })
                    }
                />
            </section>

            <section className={SECTION_CLASS}>
                <h3 className="text-base font-semibold">文団</h3>
                <textarea
                    className="textarea textarea-bordered w-full"
                    rows={2}
                    placeholder="特になし"
                    value={formData.bundanNote}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            bundanNote: e.target.value,
                        })
                    }
                />
            </section>

            <section className={SECTION_CLASS}>
                <h3 className="text-base font-semibold">その他（任意）</h3>
                <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    placeholder="その他の連絡事項があれば入力"
                    value={formData.otherNote}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            otherNote: e.target.value,
                        })
                    }
                />
            </section>

            <section className={SECTION_CLASS}>
                <h3 className="text-base font-semibold">次回部会</h3>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
                    <div className="space-y-2">
                        <label className={FIELD_LABEL_CLASS}>日付</label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={formData.nextMeetingDate}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    nextMeetingDate: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={FIELD_LABEL_CLASS}>時刻</label>
                        <input
                            type="time"
                            className="input input-bordered w-full"
                            value={formData.nextMeetingTime}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    nextMeetingTime: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={FIELD_LABEL_CLASS}>場所</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.nextMeetingLocation}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    nextMeetingLocation: e.target.value,
                                })
                            }
                        >
                            {LOCATIONS.map((loc) => (
                                <option
                                    key={loc}
                                    value={loc}
                                >
                                    {loc}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className="space-y-4 px-2 sm:px-4">
                <h3 className="text-base font-semibold">プレビュー</h3>
                <pre className="bg-base-200 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap border border-base-300">
                    {generateMarkdown()}
                </pre>
            </section>

            {/* コピーボタン */}
            <div className="flex justify-center">
                <button
                    type="button"
                    className={`btn btn-lg gap-2 ${
                        copyStatus === "success"
                            ? "btn-success"
                            : copyStatus === "error"
                            ? "btn-error"
                            : "btn-primary"
                    }`}
                    onClick={handleCopy}
                >
                    {copyStatus === "success" ? (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                            コピーしました
                        </>
                    ) : copyStatus === "error" ? (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            コピー失敗
                        </>
                    ) : (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                />
                            </svg>
                            コピー
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
