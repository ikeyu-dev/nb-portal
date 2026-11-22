"use client";

import { useEffect, useState } from "react";
import { LineRelayCandidates, type Candidate } from "./LineRelayCandidates";

type Contact = {
    organizationKey: string;
    organizationName: string;
    presidentName: string;
    lineDisplayName: string;
    lineUserId: string | null;
};

const userIdPattern = /^U[0-9a-f]{32}$/i;

export function LineRelaySettings() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingCandidate, setDeletingCandidate] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        let active = true;
        fetch("/api/line-relay", { cache: "no-store" })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok || !result.success)
                    throw new Error(
                        result.error || "部長一覧を取得できませんでした"
                    );
                if (active) {
                    setContacts(result.data);
                    setCandidates(result.candidates ?? []);
                }
            })
            .catch((caught: Error) => active && setError(caught.message))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, []);

    function updateContact(
        index: number,
        key: "presidentName" | "lineDisplayName" | "lineUserId",
        value: string
    ) {
        setSaved(false);
        setContacts((current) =>
            current.map((contact, currentIndex) =>
                currentIndex === index ? { ...contact, [key]: value } : contact
            )
        );
    }

    async function save() {
        setError("");
        setSaved(false);
        const ids = contacts
            .map((contact) => contact.lineUserId?.trim())
            .filter(Boolean);
        if (new Set(ids).size !== ids.length) {
            setError("LINEユーザーIDが重複しています。");
            return;
        }
        const invalid = contacts.find(
            (contact) =>
                contact.lineUserId?.trim() &&
                !userIdPattern.test(contact.lineUserId.trim())
        );
        if (invalid) {
            setError(
                `${invalid.organizationName}のLINEユーザーIDの形式を確認してください。`
            );
            return;
        }

        setSaving(true);
        try {
            const response = await fetch("/api/line-relay", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contacts }),
            });
            const result = await response.json();
            if (!response.ok || !result.success)
                throw new Error(
                    result.error || "部長一覧を保存できませんでした"
                );
            setContacts(result.data);
            setCandidates((current) =>
                current.filter(
                    ({ userId }) =>
                        !(result.data as Contact[]).some(
                            (contact) => contact.lineUserId === userId
                        )
                )
            );
            setSaved(true);
        } catch (caught) {
            setError((caught as Error).message);
        } finally {
            setSaving(false);
        }
    }

    async function deleteCandidate(userId: string) {
        if (!window.confirm("この候補とメッセージを削除しますか？")) return;
        setError("");
        setDeletingCandidate(true);
        try {
            const response = await fetch("/api/line-relay", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const result = await response.json();
            if (!response.ok || !result.success)
                throw new Error(result.error || "候補を削除できませんでした");
            setCandidates((current) =>
                current.filter((candidate) => candidate.userId !== userId)
            );
        } catch (caught) {
            setError((caught as Error).message);
        } finally {
            setDeletingCandidate(false);
        }
    }

    return (
        <main className="mx-auto max-w-5xl p-4 pb-32 lg:p-6">
            <div className="mb-6">
                <h1 className="text-xl font-bold">LINE転送設定</h1>
                <p className="mt-2 text-sm text-base-content/70">
                    登録した部長からの個別チャットをDiscordへ転送します。
                </p>
                <p className="mt-1 text-sm text-base-content/70">
                    転送時の表示名は手動設定で、LINE上の友だち表示名とは同期しません。
                </p>
            </div>

            {error && (
                <p
                    role="alert"
                    className="alert alert-error mb-4"
                >
                    {error}
                </p>
            )}
            {loading ? (
                <div className="flex justify-center py-16">
                    <span
                        className="loading loading-spinner loading-lg text-primary"
                        role="status"
                    />
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg border border-base-300">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>団体</th>
                                    <th>部長氏名</th>
                                    <th>転送時の表示名</th>
                                    <th>LINEユーザーID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.map((contact, index) => (
                                    <tr key={contact.organizationKey}>
                                        <th>{contact.organizationName}</th>
                                        <td>
                                            <input
                                                className="input input-bordered input-sm min-w-36"
                                                aria-label={`${contact.organizationName}の部長名`}
                                                maxLength={100}
                                                value={contact.presidentName}
                                                onChange={(event) =>
                                                    updateContact(
                                                        index,
                                                        "presidentName",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="input input-bordered input-sm min-w-48"
                                                aria-label={`${contact.organizationName}の転送時の表示名`}
                                                maxLength={100}
                                                placeholder="例：[友遊部長]氏名"
                                                value={contact.lineDisplayName}
                                                onChange={(event) =>
                                                    updateContact(
                                                        index,
                                                        "lineDisplayName",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="input input-bordered input-sm min-w-80 font-mono text-xs"
                                                aria-label={`${contact.organizationName}のLINEユーザーID`}
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                maxLength={33}
                                                placeholder="U + 32桁の16進数"
                                                value={contact.lineUserId ?? ""}
                                                onChange={(event) =>
                                                    updateContact(
                                                        index,
                                                        "lineUserId",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-3">
                        {saved && (
                            <span
                                role="status"
                                className="text-sm text-success"
                            >
                                保存しました
                            </span>
                        )}
                        <button
                            className="btn btn-primary"
                            disabled={saving || deletingCandidate}
                            onClick={() => void save()}
                        >
                            {saving ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : null}
                            {saving ? "保存中..." : "変更を保存"}
                        </button>
                    </div>
                    <LineRelayCandidates
                        candidates={candidates}
                        contacts={contacts}
                        disabled={saving || deletingCandidate}
                        onDelete={(userId) => void deleteCandidate(userId)}
                        onSelect={(index, userId) => {
                            setSaved(false);
                            setContacts((current) =>
                                current.map((contact, currentIndex) => {
                                    if (currentIndex === index)
                                        return {
                                            ...contact,
                                            lineUserId: userId,
                                        };
                                    if (contact.lineUserId?.trim() === userId)
                                        return { ...contact, lineUserId: null };
                                    return contact;
                                })
                            );
                        }}
                    />
                </>
            )}
        </main>
    );
}
