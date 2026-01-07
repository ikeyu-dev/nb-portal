"use client";

import { useState, useCallback } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
const LOCATIONS = ["Discord", "クラブ棟前", "部室", "その他"] as const;

interface ScheduleItem {
    id: string;
    content: string;
}

interface MemoFormData {
    date: string;
    time: string;
    location: string;
    customLocation: string;
    scheduleItems: ScheduleItem[];
    accountingNote: string;
    bunkouNote: string;
    otherNote: string;
    nextMeetingDate: string;
    nextMeetingTime: string;
    nextMeetingLocation: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * 部会メモ作成フォームコンポーネント
 */
export function MeetingMemoForm() {
    const [formData, setFormData] = useState<MemoFormData>(() => {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        return {
            date: today.toISOString().split("T")[0],
            time: "21:00",
            location: "Discord",
            customLocation: "",
            scheduleItems: [{ id: generateId(), content: "" }],
            accountingNote: "@部費滞納者\n部費の支払い/入部届の提出をお願いします",
            bunkouNote: "特になし",
            otherNote: "",
            nextMeetingDate: nextWeek.toISOString().split("T")[0],
            nextMeetingTime: "21:00",
            nextMeetingLocation: "Discord",
        };
    });

    const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
        "idle"
    );

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
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
                { id: generateId(), content: "" },
            ],
        }));
    };

    const removeScheduleItem = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: prev.scheduleItems.filter((item) => item.id !== id),
        }));
    };

    const updateScheduleItem = (id: string, content: string) => {
        setFormData((prev) => ({
            ...prev,
            scheduleItems: prev.scheduleItems.map((item) =>
                item.id === id ? { ...item, content } : item
            ),
        }));
    };

    const generateMarkdown = useCallback((): string => {
        const location =
            formData.location === "その他"
                ? formData.customLocation
                : formData.location;
        const header = `## ${formatDate(formData.date)} ${formData.time}- 部会@${location}`;

        const scheduleSection =
            formData.scheduleItems.filter((item) => item.content.trim())
                .length > 0
                ? `### ◯ 今後の予定\n\n${formData.scheduleItems
                      .filter((item) => item.content.trim())
                      .map((item) => {
                          const lines = item.content.split("\n");
                          return lines
                              .map((line, index) =>
                                  index === 0 ? `-   ${line}` : `    ${line}`
                              )
                              .join("\n");
                      })
                      .join("\n")}`
                : "";

        const accountingSection = formData.accountingNote.trim()
            ? `### ◯ 会計\n\n${formData.accountingNote}`
            : "";

        const bunkouSection = `### ◯ 文団\n\n${formData.bunkouNote || "特になし"}`;

        const otherSection = formData.otherNote.trim()
            ? `### ◯ その他\n\n${formData.otherNote}`
            : "";

        const nextMeetingLocation =
            formData.nextMeetingLocation === "その他"
                ? formData.customLocation
                : formData.nextMeetingLocation;
        const nextMeetingSection = `### 次回部会\n\n**${formatDate(formData.nextMeetingDate)} ${formData.nextMeetingTime}- 部会@${nextMeetingLocation}**`;

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
            {/* 基本情報 */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title text-base">基本情報</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">日付</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered"
                                value={formData.date}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        date: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">開始時刻</span>
                            </label>
                            <input
                                type="time"
                                className="input input-bordered"
                                value={formData.time}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        time: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="form-control sm:col-span-2">
                            <label className="label">
                                <span className="label-text">場所</span>
                            </label>
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
                </div>
            </div>

            {/* 今後の予定 */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <div className="flex items-center justify-between">
                        <h3 className="card-title text-base">今後の予定</h3>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={addScheduleItem}
                        >
                            追加
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.scheduleItems.map((item, index) => (
                            <div
                                key={item.id}
                                className="flex gap-2"
                            >
                                <div className="flex-1">
                                    <textarea
                                        className="textarea textarea-bordered w-full"
                                        placeholder={`予定 ${index + 1}（複数行入力可）`}
                                        rows={3}
                                        value={item.content}
                                        onChange={(e) =>
                                            updateScheduleItem(
                                                item.id,
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                                {formData.scheduleItems.length > 1 && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm text-error"
                                        onClick={() =>
                                            removeScheduleItem(item.id)
                                        }
                                    >
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
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 会計 */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title text-base">会計</h3>
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
                </div>
            </div>

            {/* 文団 */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title text-base">文団</h3>
                    <textarea
                        className="textarea textarea-bordered w-full"
                        rows={2}
                        placeholder="特になし"
                        value={formData.bunkouNote}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                bunkouNote: e.target.value,
                            })
                        }
                    />
                </div>
            </div>

            {/* その他 */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title text-base">その他（任意）</h3>
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
                </div>
            </div>

            {/* 次回部会 */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title text-base">次回部会</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">日付</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered"
                                value={formData.nextMeetingDate}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        nextMeetingDate: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">時刻</span>
                            </label>
                            <input
                                type="time"
                                className="input input-bordered"
                                value={formData.nextMeetingTime}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        nextMeetingTime: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">場所</span>
                            </label>
                            <select
                                className="select select-bordered"
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
                </div>
            </div>

            {/* プレビュー */}
            <div className="card bg-base-200 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title text-base">プレビュー</h3>
                    <pre className="bg-base-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap border border-base-300">
                        {generateMarkdown()}
                    </pre>
                </div>
            </div>

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
                            マークダウンをコピー
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
