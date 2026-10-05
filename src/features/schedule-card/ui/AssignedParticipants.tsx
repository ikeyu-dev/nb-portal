"use client";

import { useEffect, useState } from "react";
import { AsyncButton } from "@/src/shared/ui/AsyncButton";
import { ParticipantPicker, type ParticipantOption } from "./ParticipantPicker";

interface ParticipantsData {
    revision: number;
    canManage: boolean;
    participants: ParticipantOption[];
}

export function AssignedParticipants({ eventId, onSaved, onEditSchedule }: {
    eventId: string;
    onSaved?: () => void;
    onEditSchedule?: () => void;
}) {
    const [data, setData] = useState<ParticipantsData | null>(null);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [editing, setEditing] = useState(false);
    const [selection, setSelection] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/schedule-participants?${new URLSearchParams({ eventId })}`, { cache: "no-store" })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error("participants");
                if (!cancelled) { setData(result.data); setError(""); setConflict(false); }
            }).catch(() => { if (!cancelled) setError("参加者を取得できませんでした。"); });
        return () => { cancelled = true; };
    }, [eventId, attempt]);
    async function save() {
        if (!data || saving || conflict) return;
        setSaving(true);
        setError("");
        try {
            const response = await fetch("/api/schedule-participants", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, studentNumbers: selection, expectedRevision: data.revision }),
            });
            if (response.status === 409) {
                setConflict(true);
                setError("別の操作で更新されています。再取得してから選び直してください。");
                return;
            }
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error("save");
            setData(result.data);
            setEditing(false);
            setConfirmClear(false);
            onSaved?.();
        } catch { setError("参加者を保存できませんでした。もう一度お試しください。"); }
        finally { setSaving(false); }
    }
    return <section className="py-4 border-t border-base-300 space-y-3" aria-label="指定参加者">
        {!editing && <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold">指定参加者{data ? ` (${data.participants.length}人)` : ""}</h4>
            {data?.canManage && <button type="button" className="btn btn-outline btn-primary btn-sm" onClick={() => {
                setSelection(data.participants.map((p) => p.studentNumber));
                setConfirmClear(false);
                setEditing(true);
            }}>参加者を編集</button>}
        </div>}
        {error && <div role="alert" className="text-error">{error}<button type="button" disabled={saving} className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setData(null); setError(""); setAttempt((n) => n + 1); }}>再取得</button></div>}
        {!data && !error && <p role="status">読み込み中...</p>}
        {editing && data ? <>
            {confirmClear ? <>
                <p>指定参加者を全員解除しますか？</p>
                <div className="flex justify-end gap-2">
                    <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setConfirmClear(false)}>戻る</button>
                    <AsyncButton className="btn btn-error" loading={saving} disabled={conflict} onClick={save}>解除する</AsyncButton>
                </div>
            </> : <>
            <ParticipantPicker value={selection} onChange={setSelection} retained={data.participants} disabled={saving} />
            <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setEditing(false)}>キャンセル</button>
                <AsyncButton className="btn btn-primary" loading={saving} disabled={conflict} onClick={() => {
                    if (selection.length === 0 && data.participants.length > 0) setConfirmClear(true);
                    else void save();
                }}>保存</AsyncButton>
            </div>
            </>}
        </> : data && (data.participants.length ? <ul className="divide-y divide-base-300">{data.participants.map((p) => <li key={p.studentNumber} className="py-2 break-words">{p.displayName}</li>)}</ul> : <p className="text-base-content/60">参加者は指定されていません</p>)}
        {!editing && onEditSchedule && <div className="flex justify-end pt-3"><button type="button" className="btn btn-outline btn-primary" onClick={onEditSchedule}>編集</button></div>}
    </section>;
}
