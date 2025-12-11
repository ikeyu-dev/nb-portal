"use client";

import { useState } from "react";
import type { Absence } from "@/src/shared/types/api";

interface ScheduleCardProps {
    eventId: string;
    title: string;
    where?: string;
    detail?: string;
    absences: Absence[];
    dateLabel?: string;
    timeLabel?: string;
}

export default function ScheduleCard({
    eventId,
    title,
    where,
    detail,
    absences,
    dateLabel,
    timeLabel,
}: ScheduleCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 詳細を10文字までに切り詰める関数
    const truncateDetail = (text: string, maxLength: number = 10) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className="p-5 bg-base-100 rounded-xl border-l-4 border-primary shadow-sm hover:shadow-lg transition-all cursor-pointer hover:bg-base-200/50"
            >
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="shrink-0 mt-1.5">
                            <div className="w-3 h-3 bg-primary rounded-full"></div>
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-xl mb-2 flex items-center gap-2">
                                {title}
                                {timeLabel && (
                                    <span className="text-base font-normal text-base-content/70">
                                        {timeLabel}
                                    </span>
                                )}
                            </div>
                            {(where || dateLabel) && (
                                <div className="flex items-center gap-4 text-base text-base-content/80">
                                    {dateLabel && (
                                        <div className="flex items-center gap-1">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 text-primary"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            <span className="font-medium">
                                                {dateLabel}
                                            </span>
                                        </div>
                                    )}
                                    {where && (
                                        <div className="flex items-center gap-1">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 text-primary"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                            <span className="font-medium">
                                                {where}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {detail && (
                        <div className="max-lg:hidden lg:w-1/3 text-base text-base-content/80 leading-relaxed lg:border-l lg:border-base-300 lg:pl-4">
                            {truncateDetail(detail)}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-base-100">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            ✕
                        </button>
                        <h3 className="font-bold text-2xl mb-4 flex items-center gap-3">
                            {title}
                            {timeLabel && (
                                <span className="text-lg font-normal text-base-content/70">
                                    {timeLabel}
                                </span>
                            )}
                        </h3>
                        {(where || dateLabel) && (
                            <div className="flex items-center gap-4 text-lg text-base-content/80 mb-4">
                                {dateLabel && (
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
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <span className="font-medium">
                                            {dateLabel}
                                        </span>
                                    </div>
                                )}
                                {where && (
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
                                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        <span className="font-medium">
                                            {where}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                        {detail && (
                            <div className="py-4">
                                <h4 className="font-semibold text-lg mb-2">
                                    詳細
                                </h4>
                                <p className="text-base text-base-content/80 leading-relaxed whitespace-pre-wrap break-words">
                                    {detail}
                                </p>
                            </div>
                        )}

                        {/* 欠席者セクション */}
                        <div className="py-4 border-t border-base-300">
                            <h4 className="font-semibold text-lg mb-2">
                                欠席申請
                            </h4>
                            {absences.length > 0 ? (
                                <div className="space-y-2">
                                    {absences.map((absence, index) => {
                                        // absence_data シートの列構成:
                                        // A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
                                        const values = Object.values(absence);
                                        const name = String(values[3] || ""); // D列（氏名）
                                        const type = String(values[4] || ""); // E列（種別）

                                        return (
                                            <div
                                                key={index}
                                                className="p-3 bg-base-200/50 rounded-lg border border-base-300"
                                            >
                                                <div className="font-medium text-base text-base-content">
                                                    {name}{" "}
                                                    <span className="badge badge-primary badge-sm ml-2">
                                                        {type}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-base text-base-content/60">
                                    欠席者はいません
                                </p>
                            )}
                        </div>

                        <div className="modal-action">
                            <a
                                href={`/absence?eventId=${eventId}`}
                                className="btn btn-primary"
                            >
                                欠席連絡
                            </a>
                        </div>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                    >
                        <button onClick={() => setIsModalOpen(false)}>
                            close
                        </button>
                    </form>
                </dialog>
            )}
        </>
    );
}
