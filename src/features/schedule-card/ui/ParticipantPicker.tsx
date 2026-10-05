"use client";

import { useEffect, useState } from "react";
import { getMembers } from "@/src/shared/api/client";

export interface ParticipantOption {
    studentNumber: string;
    displayName: string;
}

const noParticipants: ParticipantOption[] = [];

export function ParticipantPicker({ value, onChange, retained = noParticipants, disabled = false }: {
    value: string[];
    onChange: (value: string[]) => void;
    retained?: ParticipantOption[];
    disabled?: boolean;
}) {
    const [members, setMembers] = useState<ParticipantOption[] | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [search, setSearch] = useState("");
    useEffect(() => {
        let cancelled = false;
        getMembers().then((result) => {
            if (!result.success || !result.data) throw new Error("members");
            const options = result.data.members.map(({ values }) => {
                const nickname = String(values[2] ?? "").trim();
                return {
                    studentNumber: String(values[0]).trim().toLowerCase(),
                    displayName: nickname && nickname !== "---" ? nickname : String(values[1]),
                };
            });
            if (!cancelled) { setMembers(options); setError(false); }
        }).catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [attempt]);
    const options = [...new Map([...retained, ...(members ?? [])].map((member) => [member.studentNumber, member])).values()];
    const query = search.trim().toLowerCase();
    return <fieldset disabled={disabled} className="space-y-3 min-w-0">
        <legend className="font-medium mb-2">指定参加者 <span className="text-base-content/60">{value.length}人</span></legend>
        <input type="search" aria-label="参加者を検索" placeholder="名前・学籍番号で検索" className="input input-bordered w-full" value={search} onChange={(event) => setSearch(event.target.value)} />
        {error ? <div role="alert" className="text-error">部員を取得できませんでした。<button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttempt((n) => n + 1)}>再取得</button></div>
            : members === null ? <p role="status">読み込み中...</p> : null}
        <div className="max-h-64 overflow-y-auto divide-y divide-base-300">
            {options.filter((member) => `${member.displayName} ${member.studentNumber}`.toLowerCase().includes(query)).map((member) => <label key={member.studentNumber} className="flex items-center gap-3 py-3 cursor-pointer">
                <input type="checkbox" className="checkbox checkbox-primary shrink-0" checked={value.includes(member.studentNumber)} onChange={(event) => onChange(event.target.checked ? [...value, member.studentNumber] : value.filter((id) => id !== member.studentNumber))} />
                <span className="min-w-0 break-words">{member.displayName}<span className="block text-xs text-base-content/60">{member.studentNumber}</span></span>
            </label>)}
        </div>
    </fieldset>;
}
