"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faNoteSticky,
    faPlus,
    faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { listMeetings, updateMeeting } from "../api";
import type { MeetingRecord, MeetingSummary } from "../types";

const formatDate = (value: string | null, time?: string | null) => {
    if (!value) return "日時未設定";
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return `${new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(date)}${time ? ` ${time}` : ""}`;
};

export function ExecutiveMeetingsList() {
    const router = useRouter();
    const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        listMeetings(query)
            .then((data) => active && setMeetings(data))
            .catch((caught: Error) => active && setError(caught.message))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [query]);

    async function create() {
        setCreating(true);
        setError("");
        try {
            const meeting = await updateMeeting({ action: "create" });
            if (!(meeting as MeetingRecord).id)
                throw new Error("議事録を作成できませんでした");
            router.push(
                `/executive-meetings/${(meeting as MeetingRecord).id}/edit`
            );
        } catch (caught) {
            setError((caught as Error).message);
            setCreating(false);
        }
    }

    async function resetNumbering() {
        setResetting(true);
        setError("");
        try {
            await updateMeeting({ action: "reset-numbering" });
            setConfirmReset(false);
        } catch (caught) {
            setError((caught as Error).message);
        } finally {
            setResetting(false);
        }
    }

    return (
        <main className="mx-auto max-w-5xl p-4 pb-32 lg:p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h1 className="flex items-center gap-3 text-xl font-bold">
                    <FontAwesomeIcon
                        icon={faNoteSticky}
                        className="text-primary"
                    />
                    幹部役員会議 議事録
                </h1>
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setConfirmReset(true)}
                    >
                        回数をリセット
                    </button>
                    <button
                        className="btn btn-primary"
                        disabled={creating}
                        onClick={create}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        {creating ? "作成中..." : "新規作成"}
                    </button>
                </div>
            </div>
            <label className="input input-bordered mb-4 flex w-full items-center gap-2">
                <FontAwesomeIcon
                    icon={faSearch}
                    className="text-base-content/50"
                />
                <input
                    aria-label="議事録を検索"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="議事録を検索"
                />
            </label>
            {error && <p className="alert alert-error mb-4">{error}</p>}
            {loading ? (
                <div className="flex justify-center py-16">
                    <span
                        className="loading loading-spinner loading-lg text-primary"
                        role="status"
                    />
                </div>
            ) : meetings.length === 0 ? (
                <p className="py-12 text-center text-base-content/60">
                    議事録はまだありません
                </p>
            ) : (
                <div className="divide-y divide-base-300 border-y border-base-300">
                    {meetings.map((meeting) => (
                        <Link
                            key={meeting.id}
                            href={`/executive-meetings/${meeting.id}`}
                            className="block px-2 py-4 transition-transform hover:translate-x-1"
                        >
                            <h2 className="font-semibold">{meeting.title}</h2>
                            <p className="mt-1 text-sm text-base-content/70">
                                {formatDate(
                                    meeting.meetingDate,
                                    meeting.startTime
                                )}
                                {meeting.locationType
                                    ? ` ・ ${meeting.locationType === "OTHER" ? meeting.locationDetail : { MEETING_ROOM: "会議室", DISCORD: "Discord", CLUB_ROOM: "部室" }[meeting.locationType]}`
                                    : " ・ 場所未設定"}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
            {confirmReset && (
                <dialog
                    open
                    className="modal modal-bottom sm:modal-middle"
                >
                    <div className="modal-box">
                        <h2 className="text-lg font-bold">
                            議事録の回数をリセットしますか？
                        </h2>
                        <p className="py-4">
                            次に作成する議事録は第1回になります。既存の議事録は変更されません。
                        </p>
                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                disabled={resetting}
                                onClick={() => setConfirmReset(false)}
                            >
                                キャンセル
                            </button>
                            <button
                                className="btn btn-primary"
                                disabled={resetting}
                                onClick={() => void resetNumbering()}
                            >
                                {resetting ? "処理中..." : "リセット"}
                            </button>
                        </div>
                    </div>
                    <button
                        className="modal-backdrop"
                        aria-label="閉じる"
                        onClick={() => setConfirmReset(false)}
                    />
                </dialog>
            )}
        </main>
    );
}
