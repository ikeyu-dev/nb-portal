"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardQuestion, faPlus } from "@fortawesome/free-solid-svg-icons";
import { listSurveys, updateSurvey } from "./api";
import type { SurveySummary } from "./types";

export function SurveysList() {
    const router = useRouter();
    const [surveys, setSurveys] = useState<SurveySummary[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        listSurveys()
            .then(setSurveys)
            .catch((caught: Error) => setError(caught.message))
            .finally(() => setLoading(false));
    }, []);

    async function create() {
        setCreating(true);
        setError("");
        try {
            const created = await updateSurvey({ action: "create" });
            if (!created?.id) throw new Error("作成できませんでした");
            router.push(`/surveys/${created.id}`);
        } catch (caught) {
            setError((caught as Error).message);
            setCreating(false);
        }
    }

    return (
        <main className="mx-auto max-w-5xl p-4 lg:p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h1 className="flex items-center gap-3 text-xl font-bold">
                    <FontAwesomeIcon
                        icon={faClipboardQuestion}
                        className="text-primary"
                    />
                    アンケート
                </h1>
                <button
                    className="btn btn-primary"
                    disabled={creating}
                    onClick={create}
                >
                    <FontAwesomeIcon icon={faPlus} />
                    {creating ? "作成中..." : "新規作成"}
                </button>
            </div>
            {error && <p className="alert alert-error mb-4">{error}</p>}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <span
                        className="loading loading-spinner loading-lg text-primary"
                        role="status"
                        aria-label="アンケートを読み込み中"
                    />
                </div>
            ) : surveys.length === 0 ? (
                <p className="py-12 text-center text-base-content/60">
                    アンケートはまだありません
                </p>
            ) : (
                <div className="divide-y divide-base-300 border-y border-base-300">
                    {surveys.map((survey) => (
                        <Link
                            key={survey.id}
                            href={`/surveys/${survey.id}`}
                            className="block px-2 py-4 transition-colors hover:bg-base-200"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="font-semibold">
                                        {survey.title || "無題のアンケート"}
                                    </h2>
                                    {survey.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-base-content/70">
                                            {survey.description}
                                        </p>
                                    )}
                                </div>
                                <span className="badge badge-outline shrink-0">
                                    {survey.status === "draft"
                                        ? "下書き"
                                        : survey.status === "closed" ||
                                            (survey.deadline_at &&
                                                Date.parse(
                                                    survey.deadline_at
                                                ) <= Date.now())
                                          ? "終了"
                                          : "受付中"}
                                </span>
                            </div>
                            {survey.deadline_at && (
                                <p className="mt-2 text-xs text-base-content/60">
                                    締切{" "}
                                    {new Date(
                                        survey.deadline_at
                                    ).toLocaleString("ja-JP")}
                                </p>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
