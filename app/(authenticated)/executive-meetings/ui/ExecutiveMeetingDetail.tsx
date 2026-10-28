"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft,
    faArrowDown,
    faArrowUp,
    faCopy,
    faPaperPlane,
    faPlus,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { getMeeting, updateMeeting } from "../api";
import type { Agenda, MeetingRecord } from "../types";
import { AgendaRichTextEditor } from "./AgendaRichTextEditor";

type SaveState = "saved" | "saving" | "error";

const locationLabels: Record<string, string> = {
    MEETING_ROOM: "会議室",
    DISCORD: "Discord",
    CLUB_ROOM: "部室",
    OTHER: "その他",
};

const formatJst = (value: string | null) =>
    value
        ? new Intl.DateTimeFormat("ja-JP", {
              timeZone: "Asia/Tokyo",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
          }).format(new Date(value))
        : "";

const markdownForCopy = (meeting: MeetingRecord) => meeting.markdown;

export function ExecutiveMeetingDetail({
    id,
    initialEdit = false,
}: {
    id: string;
    initialEdit?: boolean;
}) {
    const router = useRouter();
    const [meeting, setMeeting] = useState<MeetingRecord | null>(null);
    const [editing, setEditing] = useState(initialEdit);
    const [saveState, setSaveState] = useState<SaveState>("saved");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirmAction, setConfirmAction] = useState<
        "send" | "delete" | null
    >(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef<MeetingRecord | null>(null);
    const saving = useRef(false);
    const pending = useRef(false);

    const load = useCallback(
        async (since?: string) => {
            const value = await getMeeting(id, since);
            if ("unchanged" in value) return null;
            return value;
        },
        [id]
    );

    useEffect(() => {
        let active = true;
        load()
            .then((value) => {
                if (!active || !value) return;
                setMeeting(value);
                latest.current = value;
                if (initialEdit && !value.canEdit) setEditing(false);
            })
            .catch((caught: Error) => active && setError(caught.message));
        return () => {
            active = false;
        };
    }, [initialEdit, load]);

    useEffect(() => {
        if (editing || !meeting) return;
        const interval = window.setInterval(() => {
            load(meeting.updatedAt)
                .then((value) => {
                    if (value) {
                        setMeeting(value);
                        latest.current = value;
                    }
                })
                .catch(() => undefined);
        }, 5000);
        return () => window.clearInterval(interval);
    }, [editing, load, meeting]);

    const persist = useCallback(async () => {
        const current = latest.current;
        if (!current || !pending.current || saving.current) return;
        saving.current = true;
        pending.current = false;
        setSaveState("saving");
        let failure: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const saved = (await updateMeeting({
                    action: "save",
                    id: current.id,
                    meetingDate: current.meetingDate,
                    startTime: current.startTime,
                    locationType: current.locationType,
                    locationDetail: current.locationDetail,
                    attendeeStudentNumbers: current.attendeeStudentNumbers,
                    content: current.content,
                })) as MeetingRecord;
                if (latest.current === current) {
                    latest.current = saved;
                    setMeeting(saved);
                    setSaveState("saved");
                } else {
                    setSaveState("saving");
                }
                failure = null;
                break;
            } catch (caught) {
                failure = caught as Error;
                if (attempt < 2)
                    await new Promise((resolve) =>
                        setTimeout(resolve, 400 * (attempt + 1))
                    );
            }
        }
        saving.current = false;
        if (failure) {
            pending.current = true;
            setSaveState("error");
            setError(failure.message);
        }
    }, []);

    useEffect(() => {
        if (!editing || saveState !== "saving") return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void persist(), 1000);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [editing, meeting, persist, saveState]);

    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (editing && (pending.current || saving.current)) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [editing]);

    const mutate = (update: (record: MeetingRecord) => MeetingRecord) => {
        const current = latest.current;
        if (!current) return;
        const next = update(current);
        latest.current = next;
        pending.current = true;
        setMeeting(next);
        setSaveState("saving");
        setError("");
    };

    const leaveEdit = async () => {
        if (timer.current) clearTimeout(timer.current);
        if (pending.current) await persist();
        while (saving.current)
            await new Promise((resolve) => setTimeout(resolve, 50));
        if (pending.current) await persist();
        while (saving.current)
            await new Promise((resolve) => setTimeout(resolve, 50));
        if (pending.current) {
            if (
                !window.confirm(
                    "保存に失敗しました。未保存のまま移動しますか？"
                )
            )
                return;
        }
        setEditing(false);
        router.push(`/executive-meetings/${id}`);
    };

    useEffect(() => {
        if (!editing) return;
        const interceptNavigation = (event: MouseEvent) => {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            )
                return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest("a[href]");
            if (
                !(anchor instanceof HTMLAnchorElement) ||
                anchor.target ||
                anchor.origin !== window.location.origin
            )
                return;
            if (!pending.current && !saving.current) return;
            event.preventDefault();
            event.stopPropagation();
            void (async () => {
                if (timer.current) clearTimeout(timer.current);
                if (pending.current) await persist();
                while (saving.current)
                    await new Promise((resolve) => setTimeout(resolve, 50));
                if (pending.current) await persist();
                while (saving.current)
                    await new Promise((resolve) => setTimeout(resolve, 50));
                if (
                    pending.current &&
                    !window.confirm(
                        "保存に失敗しました。未保存のまま移動しますか？"
                    )
                )
                    return;
                const destination = new URL(anchor.href);
                router.push(
                    `${destination.pathname}${destination.search}${destination.hash}`
                );
            })();
        };
        document.addEventListener("click", interceptNavigation, true);
        return () =>
            document.removeEventListener("click", interceptNavigation, true);
    }, [editing, persist, router]);

    const sendDiscord = async () => {
        setBusy(true);
        setError("");
        setConfirmAction(null);
        try {
            if (pending.current) await persist();
            while (saving.current)
                await new Promise((resolve) => setTimeout(resolve, 50));
            if (pending.current) await persist();
            if (pending.current)
                throw new Error("保存に失敗したため送信できません");
            await updateMeeting({ action: "claim-discord", id });
            const fresh = await load();
            if (fresh) {
                setMeeting(fresh);
                latest.current = fresh;
            }
        } catch (caught) {
            setError((caught as Error).message);
            const fresh = await load().catch(() => null);
            if (fresh) {
                setMeeting(fresh);
                latest.current = fresh;
            }
        } finally {
            setBusy(false);
        }
    };

    const deleteMeeting = async () => {
        setBusy(true);
        try {
            await updateMeeting({ action: "delete", id });
            router.push("/executive-meetings");
        } catch (caught) {
            setError((caught as Error).message);
            setBusy(false);
        }
    };

    if (error && !meeting)
        return (
            <main className="mx-auto max-w-4xl p-6">
                <p className="alert alert-error">{error}</p>
            </main>
        );
    if (!meeting)
        return (
            <div className="flex min-h-64 items-center justify-center">
                <span
                    className="loading loading-spinner loading-lg text-primary"
                    role="status"
                />
            </div>
        );

    const location =
        meeting.locationType === "OTHER"
            ? meeting.locationDetail
            : locationLabels[meeting.locationType ?? ""];
    const names = meeting.attendees
        .map((person) => person.nickname || person.name)
        .join("、");
    const discordDone =
        meeting.discord.embed.state === "SENT" &&
        meeting.discord.body.state === "SENT";

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-36 sm:px-6 lg:px-8">
            <Link
                href="/executive-meetings"
                className="link link-primary inline-flex items-center gap-2"
            >
                <FontAwesomeIcon icon={faArrowLeft} /> 議事録一覧
            </Link>
            <div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold">{meeting.title}</h1>
                    {meeting.meetingDate && (
                        <p className="mt-1 text-sm text-base-content/60">
                            {meeting.meetingDate} {meeting.startTime}
                        </p>
                    )}
                </div>
                {meeting.canEdit && !editing && (
                    <Link
                        className="btn btn-outline"
                        href={`/executive-meetings/${id}/edit`}
                    >
                        編集
                    </Link>
                )}
                {meeting.canEdit && editing && (
                    <button
                        className="btn btn-outline"
                        onClick={leaveEdit}
                    >
                        閲覧に戻る
                    </button>
                )}
            </div>
            {error && <p className="alert alert-error mb-4">{error}</p>}

            {editing ? (
                <div className="space-y-6">
                    <section className="space-y-4 border-b border-base-300 px-2 pb-8 sm:px-4">
                        <h2 className="text-base font-semibold">基本情報</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-base-content/70">
                                    日付
                                </label>
                                <input
                                    className="input input-bordered w-full"
                                    type="date"
                                    value={meeting.meetingDate ?? ""}
                                    onChange={(e) =>
                                        mutate((m) => ({
                                            ...m,
                                            meetingDate: e.target.value || null,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-base-content/70">
                                    開始時刻
                                </label>
                                <input
                                    className="input input-bordered w-full"
                                    type="time"
                                    value={meeting.startTime ?? ""}
                                    onChange={(e) =>
                                        mutate((m) => ({
                                            ...m,
                                            startTime: e.target.value || null,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-base-content/70">
                                    場所
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(locationLabels).map(
                                        ([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className={`btn btn-sm ${meeting.locationType === value ? "btn-primary" : "btn-outline"}`}
                                                onClick={() =>
                                                    mutate((m) => ({
                                                        ...m,
                                                        locationType: value,
                                                    }))
                                                }
                                            >
                                                {label}
                                            </button>
                                        )
                                    )}
                                </div>
                                {meeting.locationType === "OTHER" && (
                                    <input
                                        className="input input-bordered mt-2"
                                        placeholder="場所を入力"
                                        value={meeting.locationDetail}
                                        onChange={(e) =>
                                            mutate((m) => ({
                                                ...m,
                                                locationDetail: e.target.value,
                                            }))
                                        }
                                    />
                                )}
                            </div>
                            <fieldset className="min-w-0">
                                <legend className="mb-2 text-sm font-medium">
                                    出席者
                                </legend>
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    {meeting.availableOfficers.map((person) => (
                                        <label
                                            key={person.studentNumber}
                                            className="flex min-h-9 cursor-pointer items-center gap-1.5 text-sm"
                                        >
                                            <input
                                                className="checkbox checkbox-primary checkbox-sm"
                                                type="checkbox"
                                                checked={meeting.attendeeStudentNumbers.includes(
                                                    person.studentNumber
                                                )}
                                                disabled={
                                                    person.studentNumber ===
                                                    meeting.createdBy
                                                }
                                                onChange={(e) =>
                                                    mutate((m) => ({
                                                        ...m,
                                                        attendeeStudentNumbers:
                                                            e.target.checked
                                                                ? [
                                                                      ...m.attendeeStudentNumbers,
                                                                      person.studentNumber,
                                                                  ]
                                                                : m.attendeeStudentNumbers.filter(
                                                                      (n) =>
                                                                          n !==
                                                                          person.studentNumber
                                                                  ),
                                                    }))
                                                }
                                            />
                                            {person.nickname || person.name}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>
                    </section>
                    <section className="space-y-8">
                        {meeting.content.agendas.map((agenda, index) => (
                            <article
                                key={agenda.id}
                                className="space-y-4 border-b border-base-300 pb-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold">
                                        議題{index + 1}
                                    </h2>
                                    <div className="flex gap-1">
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            aria-label="上へ移動"
                                            disabled={index === 0}
                                            onClick={() =>
                                                mutate((m) => {
                                                    const agendas = [
                                                        ...m.content.agendas,
                                                    ];
                                                    [
                                                        agendas[index - 1],
                                                        agendas[index],
                                                    ] = [
                                                        agendas[index],
                                                        agendas[index - 1],
                                                    ];
                                                    return {
                                                        ...m,
                                                        content: {
                                                            ...m.content,
                                                            agendas,
                                                        },
                                                    };
                                                })
                                            }
                                        >
                                            <FontAwesomeIcon icon={faArrowUp} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            aria-label="下へ移動"
                                            disabled={
                                                index ===
                                                meeting.content.agendas.length -
                                                    1
                                            }
                                            onClick={() =>
                                                mutate((m) => {
                                                    const agendas = [
                                                        ...m.content.agendas,
                                                    ];
                                                    [
                                                        agendas[index + 1],
                                                        agendas[index],
                                                    ] = [
                                                        agendas[index],
                                                        agendas[index + 1],
                                                    ];
                                                    return {
                                                        ...m,
                                                        content: {
                                                            ...m.content,
                                                            agendas,
                                                        },
                                                    };
                                                })
                                            }
                                        >
                                            <FontAwesomeIcon
                                                icon={faArrowDown}
                                            />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm text-error"
                                            aria-label="議題を削除"
                                            disabled={
                                                meeting.content.agendas
                                                    .length === 1
                                            }
                                            onClick={() =>
                                                mutate((m) => ({
                                                    ...m,
                                                    content: {
                                                        ...m.content,
                                                        agendas:
                                                            m.content.agendas.filter(
                                                                (item) =>
                                                                    item.id !==
                                                                    agenda.id
                                                            ),
                                                    },
                                                }))
                                            }
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </div>
                                <input
                                    className="input input-bordered w-full"
                                    aria-label={`議題${index + 1}の議題名`}
                                    placeholder="議題名"
                                    value={agenda.title}
                                    onChange={(e) =>
                                        updateAgenda(mutate, agenda.id, {
                                            title: e.target.value,
                                        })
                                    }
                                />
                                <AgendaRichTextEditor
                                    value={agenda.body}
                                    editable
                                    onChange={(body) =>
                                        updateAgenda(mutate, agenda.id, {
                                            body,
                                        })
                                    }
                                />
                            </article>
                        ))}
                        <div className="space-y-4 border-t border-base-300 pt-4">
                            <button
                                className="btn btn-ghost"
                                onClick={() =>
                                    mutate((m) => ({
                                        ...m,
                                        content: {
                                            ...m.content,
                                            agendas: [
                                                ...m.content.agendas,
                                                {
                                                    id: crypto.randomUUID(),
                                                    title: "",
                                                    body: "",
                                                },
                                            ],
                                        },
                                    }))
                                }
                            >
                                <FontAwesomeIcon icon={faPlus} /> 議題を追加
                            </button>
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-base-content/70">
                                    その他
                                </h3>
                                <AgendaRichTextEditor
                                    value={meeting.content.other}
                                    editable
                                    onChange={(other) =>
                                        mutate((m) => ({
                                            ...m,
                                            content: {
                                                ...m.content,
                                                other,
                                            },
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </section>
                    <div className="flex flex-wrap gap-3 border-t border-base-300 pt-4">
                        {!discordDone ? (
                            <button
                                className="btn btn-primary"
                                disabled={busy || saveState === "error"}
                                onClick={() => setConfirmAction("send")}
                            >
                                <FontAwesomeIcon icon={faPaperPlane} />
                                {busy
                                    ? "送信中..."
                                    : meeting.discord.embed.state ===
                                            "FAILED" ||
                                        meeting.discord.body.state === "FAILED"
                                      ? "失敗分を再送"
                                      : "Discordへ送信"}
                            </button>
                        ) : (
                            <span className="badge badge-success badge-outline">
                                送信済み {formatJst(meeting.discord.sentAt)}
                            </span>
                        )}
                        {(meeting.discord.embed.state === "FAILED" ||
                            meeting.discord.body.state === "FAILED") && (
                            <p className="basis-full text-sm text-error">
                                {meeting.discord.embed.state === "FAILED"
                                    ? `Embed: ${meeting.discord.embed.error}`
                                    : `本文: ${meeting.discord.body.error}`}
                            </p>
                        )}
                        {discordDone && (
                            <p className="basis-full text-xs text-base-content/60">
                                Discord投稿後の編集内容は、投稿には反映されません。
                            </p>
                        )}
                        {meeting.canEdit && (
                            <button
                                className="btn btn-error btn-outline"
                                onClick={() => setConfirmAction("delete")}
                            >
                                削除
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    <dl className="mb-6 grid gap-3 border-y border-base-300 py-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm text-base-content/60">
                                開催日時
                            </dt>
                            <dd>
                                {meeting.meetingDate ?? "未設定"}{" "}
                                {meeting.startTime ?? ""}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-base-content/60">
                                場所
                            </dt>
                            <dd>{location || "未設定"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm text-base-content/60">
                                出席者
                            </dt>
                            <dd>{names || "なし"}</dd>
                        </div>
                    </dl>
                    {meeting.content.agendas.map((agenda, index) => (
                        <section
                            key={agenda.id}
                            className="border-b border-base-300 py-5"
                        >
                            <h2 className="mb-3 text-lg font-semibold">
                                {agenda.title || `議題${index + 1}`}
                            </h2>
                            <AgendaRichTextEditor
                                value={agenda.body}
                                editable={false}
                            />
                        </section>
                    ))}
                    {meeting.content.other && (
                        <section className="py-5">
                            <h2 className="mb-3 text-lg font-semibold">
                                その他
                            </h2>
                            <AgendaRichTextEditor
                                value={meeting.content.other}
                                editable={false}
                            />
                        </section>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                            className="btn btn-outline"
                            onClick={() =>
                                void navigator.clipboard.writeText(
                                    markdownForCopy(meeting)
                                )
                            }
                        >
                            <FontAwesomeIcon icon={faCopy} /> Markdownをコピー
                        </button>
                        {meeting.discord.sentAt && (
                            <span className="text-sm text-base-content/60">
                                Discord送信済み{" "}
                                {formatJst(meeting.discord.sentAt)}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {editing && (
                <div className="fixed inset-x-0 bottom-16 z-20 flex justify-center lg:bottom-0">
                    <div className="rounded-t-box bg-base-100/95 px-4 py-2 text-sm shadow">
                        {saveState === "saving"
                            ? "保存中..."
                            : saveState === "error"
                              ? "保存に失敗しました"
                              : `保存済み ${formatJst(meeting.updatedAt)}`}
                    </div>
                </div>
            )}
            {confirmAction && (
                <dialog
                    open
                    className="modal modal-bottom sm:modal-middle"
                >
                    <div className="modal-box">
                        <h2 className="text-lg font-bold">
                            {confirmAction === "send"
                                ? "Discordへ送信しますか？"
                                : "議事録を削除しますか？"}
                        </h2>
                        <p className="whitespace-pre-line py-4">
                            {confirmAction === "send"
                                ? "幹部チャンネルの指定スレッドへEmbedと議事録本文を送信します。\n送信先：幹部役員会議スレッド"
                                : "この議事録を完全に削除します。Discordへの投稿は削除されません。"}
                        </p>
                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setConfirmAction(null)}
                            >
                                キャンセル
                            </button>
                            <button
                                className={`btn ${confirmAction === "delete" ? "btn-error" : "btn-primary"}`}
                                disabled={busy}
                                onClick={() =>
                                    confirmAction === "send"
                                        ? void sendDiscord()
                                        : void deleteMeeting()
                                }
                            >
                                {confirmAction === "send" ? "送信" : "削除"}
                            </button>
                        </div>
                    </div>
                    <button
                        className="modal-backdrop"
                        aria-label="閉じる"
                        onClick={() => setConfirmAction(null)}
                    />
                </dialog>
            )}
        </main>
    );
}

function updateAgenda(
    mutate: (update: (record: MeetingRecord) => MeetingRecord) => void,
    agendaId: string,
    changes: Partial<Agenda>
) {
    mutate((meeting) => ({
        ...meeting,
        content: {
            ...meeting.content,
            agendas: meeting.content.agendas.map((agenda) =>
                agenda.id === agendaId ? { ...agenda, ...changes } : agenda
            ),
        },
    }));
}
