"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSurvey } from "./api";
import type { Question, Survey } from "./types";

type AnswerBucket = { value: string; label: string };

const jstDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

const formatSubmittedAt = (value: string) => {
    const utcValue = value.includes("T")
        ? value
        : `${value.replace(" ", "T")}Z`;
    const date = new Date(utcValue);
    if (Number.isNaN(date.getTime())) return value;

    const parts = jstDateTimeFormatter.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value || "";

    return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
};

const answerLabel = (
    question: Question,
    value: string | string[] | undefined
) => {
    if (Array.isArray(value))
        return value
            .map(
                (id) =>
                    question.options.find((option) => option.id === id)
                        ?.label ?? id
            )
            .join("、");
    return (
        question.options.find((option) => option.id === value)?.label ??
        value ??
        "未回答"
    );
};

function bucketsFor(survey: Survey, question: Question): AnswerBucket[] {
    if (question.type === "single" || question.type === "multiple")
        return question.options.map((option) => ({
            value: option.id,
            label: option.label,
        }));
    const values = new Set(
        (survey.responses ?? [])
            .map((response) => response.answers[question.id])
            .filter(
                (value): value is string =>
                    typeof value === "string" && value !== ""
            )
    );
    return [...values].sort().map((value) => ({ value, label: value }));
}

export function SurveyResponses({ id }: { id: string }) {
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [view, setView] = useState<"responses" | "answers">("responses");
    const [questionId, setQuestionId] = useState("");
    const [answerValue, setAnswerValue] = useState("");

    useEffect(() => {
        getSurvey(id)
            .then((data) => {
                setSurvey(data);
                setQuestionId(data.questions[0]?.id ?? "");
            })
            .catch((caught: Error) => setError(caught.message))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!survey?.open) return;
        const interval = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            getSurvey(id)
                .then((updated) =>
                    setSurvey((current) =>
                        current
                            ? {
                                  ...current,
                                  responses: updated.responses,
                                  open: updated.open,
                                  status: updated.status,
                              }
                            : current
                    )
                )
                .catch(() => undefined);
        }, 15_000);
        return () => window.clearInterval(interval);
    }, [id, survey?.open]);

    const question = survey?.questions.find((item) => item.id === questionId);
    const buckets = useMemo(
        () => (survey && question ? bucketsFor(survey, question) : []),
        [survey, question]
    );
    const selectedBucket = buckets.find(
        (bucket) => bucket.value === answerValue
    );
    const matchingResponses = (survey?.responses ?? []).filter((response) => {
        if (!question || !answerValue) return false;
        const answer = response.answers[question.id];
        return Array.isArray(answer)
            ? answer.includes(answerValue)
            : answer === answerValue;
    });

    if (loading)
        return (
            <main className="mx-auto max-w-6xl p-4 lg:p-6">読み込み中...</main>
        );
    if (!survey || !survey.responses)
        return (
            <main className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
                <Link
                    href={`/surveys/${id}`}
                    className="link link-primary"
                >
                    アンケートへ戻る
                </Link>
                <p className="alert alert-error">
                    {error || "回答状況を表示できません。"}
                </p>
            </main>
        );

    return (
        <main className="mx-auto max-w-6xl space-y-5 p-4 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <Link
                        href={`/surveys/${id}`}
                        className="text-sm text-primary"
                    >
                        アンケートへ戻る
                    </Link>
                    <h1 className="mt-2 text-xl font-bold">
                        {survey.title} の回答状況
                    </h1>
                </div>
                <span className="badge badge-primary badge-lg">
                    {survey.responses.length}件
                </span>
            </div>

            <div
                role="tablist"
                className="tabs tabs-bordered"
            >
                <Link
                    href={`/surveys/${id}`}
                    role="tab"
                    aria-selected="false"
                    className="tab"
                >
                    回答画面
                </Link>
                <Link
                    href={`/surveys/${id}/responses`}
                    role="tab"
                    aria-selected="true"
                    className="tab tab-active"
                >
                    回答状況
                </Link>
            </div>

            <div
                role="tablist"
                className="tabs tabs-bordered"
            >
                <button
                    role="tab"
                    aria-selected={view === "responses"}
                    className={`tab ${view === "responses" ? "tab-active" : ""}`}
                    onClick={() => setView("responses")}
                >
                    回答一覧
                </button>
                <button
                    role="tab"
                    aria-selected={view === "answers"}
                    className={`tab ${view === "answers" ? "tab-active" : ""}`}
                    onClick={() => setView("answers")}
                >
                    回答別
                </button>
            </div>

            {view === "responses" ? (
                <>
                    <div className="overflow-x-auto rounded-lg border border-base-300">
                        <table className="table table-zebra table-pin-rows table-sm min-w-[48rem] w-full">
                            <thead>
                                <tr>
                                    <th className="bg-base-200">学籍番号</th>
                                    <th className="bg-base-200">あだ名</th>
                                    <th className="bg-base-200">氏名</th>
                                    <th className="bg-base-200">回答日時</th>
                                    {survey.questions.map((item) => (
                                        <th
                                            key={item.id}
                                            className="min-w-48 bg-base-200"
                                        >
                                            {item.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {survey.responses.length
                                    ? survey.responses.map((response) => (
                                          <tr key={response.studentId}>
                                              <td>{response.studentId}</td>
                                              <td>
                                                  {response.nickname?.trim() ||
                                                      "未設定"}
                                              </td>
                                              <td>{response.name}</td>
                                              <td className="whitespace-nowrap">
                                                  {formatSubmittedAt(
                                                      response.submittedAt
                                                  )}
                                              </td>
                                              {survey.questions.map((item) => (
                                                  <td
                                                      key={item.id}
                                                      className="whitespace-pre-wrap"
                                                  >
                                                      {answerLabel(
                                                          item,
                                                          response.answers[
                                                              item.id
                                                          ]
                                                      )}
                                                  </td>
                                              ))}
                                          </tr>
                                      ))
                                    : null}
                            </tbody>
                        </table>
                    </div>
                    {survey.responses.length === 0 && (
                        <p className="py-8 text-center text-base-content/60">
                            回答はまだありません
                        </p>
                    )}
                </>
            ) : (
                <section className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <label className="form-control w-full max-w-md">
                            <span className="label-text">質問</span>
                            <select
                                aria-label="質問"
                                className="select select-bordered mt-1"
                                value={questionId}
                                onChange={(event) => {
                                    setQuestionId(event.target.value);
                                    setAnswerValue("");
                                }}
                            >
                                {survey.questions.map((item) => (
                                    <option
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="form-control w-full max-w-md">
                            <span className="label-text">回答</span>
                            <select
                                aria-label="回答"
                                className="select select-bordered mt-1"
                                value={answerValue}
                                onChange={(event) =>
                                    setAnswerValue(event.target.value)
                                }
                                disabled={!buckets.length}
                            >
                                <option value="">回答を選択</option>
                                {buckets.map((bucket) => (
                                    <option
                                        key={bucket.value}
                                        value={bucket.value}
                                    >
                                        {bucket.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {question && selectedBucket ? (
                        <div className="overflow-x-auto rounded-lg border border-base-300">
                            <table className="table table-zebra table-sm w-full">
                                <caption className="caption-top px-3 py-3 text-left font-semibold">
                                    「{selectedBucket.label}」を回答した人（
                                    {matchingResponses.length}人）
                                </caption>
                                <thead>
                                    <tr>
                                        <th className="bg-base-200">
                                            学籍番号
                                        </th>
                                        <th className="bg-base-200">あだ名</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matchingResponses.length ? (
                                        matchingResponses.map((response) => (
                                            <tr key={response.studentId}>
                                                <td>{response.studentId}</td>
                                                <td>
                                                    {response.nickname?.trim() ||
                                                        "未設定"}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={2}
                                                className="py-8 text-center text-base-content/60"
                                            >
                                                該当する回答はありません
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="py-8 text-center text-base-content/60">
                            質問と回答を選択してください
                        </p>
                    )}
                </section>
            )}
        </main>
    );
}
