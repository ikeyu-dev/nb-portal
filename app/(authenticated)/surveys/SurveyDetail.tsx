"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AppModal } from "@/src/shared/ui/AppModal";
import {
    faArrowDown,
    faArrowLeft,
    faArrowUp,
    faCalendarDays,
    faPlus,
    faTable,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { getSurvey, updateSurvey } from "./api";
import { validateSurveyAnswers } from "./validation";
import type {
    Answers,
    Question,
    QuestionType,
    Survey,
    SurveySection,
} from "./types";

const questionTypes: { value: QuestionType; label: string }[] = [
    { value: "short", label: "短文" },
    { value: "long", label: "長文" },
    { value: "single", label: "単一選択" },
    { value: "multiple", label: "複数選択" },
    { value: "date", label: "日付" },
    { value: "number", label: "数値" },
];

const newQuestion = (sectionId: string): Question => ({
    id: crypto.randomUUID(),
    sectionId,
    label: "",
    type: "short",
    required: false,
    options: [],
});

const newSection = (index: number): SurveySection => ({
    id: crypto.randomUUID(),
    title: `セクション${index}`,
    description: "",
});

const localDateTime = (iso: string | null) => {
    if (!iso) return "";
    const date = new Date(iso);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
};

const optionDateValue = (label: string) => {
    const match = label.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
};

const draftBody = (id: string, survey: Survey) => ({
    action: "save" as const,
    id,
    title: survey.title,
    description: survey.description,
    deadlineAt: survey.deadlineAt,
    resultsPublic: survey.resultsPublic,
    sections: survey.sections,
    questions: survey.questions,
});

function QuestionInput({
    question,
    value,
    onChange,
    disabled,
    error,
}: {
    question: Question;
    value: string | string[] | undefined;
    onChange: (value: string | string[]) => void;
    disabled: boolean;
    error?: string;
}) {
    if (question.type === "long") {
        return (
            <div>
                <textarea
                    className="textarea textarea-bordered w-full"
                    aria-label={question.label}
                    aria-invalid={!!error}
                    rows={4}
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    required={question.required}
                />
                {error && <p className="mt-1 text-sm text-error">{error}</p>}
            </div>
        );
    }
    if (question.type === "single" || question.type === "multiple") {
        return (
            <div className="space-y-2">
                <div
                    role="group"
                    aria-label={question.label}
                    aria-describedby={
                        error ? `answer-error-${question.id}` : undefined
                    }
                >
                    {question.options.map((option) => {
                        const checked =
                            question.type === "single"
                                ? value === option.id
                                : Array.isArray(value) &&
                                  value.includes(option.id);
                        return (
                            <label
                                key={option.id}
                                className="flex items-center gap-3"
                            >
                                <input
                                    type={
                                        question.type === "single"
                                            ? "radio"
                                            : "checkbox"
                                    }
                                    name={question.id}
                                    className={
                                        question.type === "single"
                                            ? "radio radio-primary radio-sm"
                                            : "checkbox checkbox-primary checkbox-sm"
                                    }
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => {
                                        if (question.type === "single")
                                            onChange(option.id);
                                        else
                                            onChange(
                                                checked
                                                    ? (
                                                          value as string[]
                                                      ).filter(
                                                          (id) =>
                                                              id !== option.id
                                                      )
                                                    : [
                                                          ...(Array.isArray(
                                                              value
                                                          )
                                                              ? value
                                                              : []),
                                                          option.id,
                                                      ]
                                            );
                                    }}
                                />
                                <span>{option.label}</span>
                            </label>
                        );
                    })}
                </div>
                {error && (
                    <p
                        id={`answer-error-${question.id}`}
                        className="text-sm text-error"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    }
    return (
        <div>
            <input
                className="input input-bordered w-full"
                aria-label={question.label}
                aria-invalid={!!error}
                type={
                    question.type === "date"
                        ? "date"
                        : question.type === "number"
                          ? "number"
                          : "text"
                }
                step={question.type === "number" ? "any" : undefined}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                required={question.required}
            />
            {error && <p className="mt-1 text-sm text-error">{error}</p>}
        </div>
    );
}

function SaveStatus({ message }: { message: string }) {
    return (
        <p
            role="status"
            className="min-h-10 text-sm text-base-content/70"
        >
            {message}
        </p>
    );
}

export function SurveyDetail({ id }: { id: string }) {
    const router = useRouter();
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [answers, setAnswers] = useState<Answers>({});
    const [editing, setEditing] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saveState, setSaveState] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [sectionError, setSectionError] = useState("");
    const [answerErrors, setAnswerErrors] = useState<Record<string, string>>(
        {}
    );
    const [editorErrors, setEditorErrors] = useState<Record<string, string>>(
        {}
    );
    const [focusTarget, setFocusTarget] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pending = useRef<Promise<unknown>>(Promise.resolve());
    const latestAnswers = useRef<Answers>({});
    const answerRevision = useRef(0);
    const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const draftPending = useRef<Promise<void>>(Promise.resolve());
    const lastSavedDraft = useRef<string | null>(null);
    const savedSurveySnapshot = useRef<string | null>(null);
    const latestDraft = useRef<Survey | null>(null);
    latestDraft.current = survey?.status === "draft" ? survey : null;
    const showResults =
        survey !== null &&
        survey.status !== "draft" &&
        (survey.resultsPublic || survey.canEdit);
    const editorSnapshot = survey
        ? JSON.stringify(draftBody(id, survey))
        : null;
    const hasUnsavedPublishedEdits =
        editing &&
        survey?.status !== "draft" &&
        editorSnapshot !== savedSurveySnapshot.current;

    const refresh = useCallback(async () => {
        const data = await getSurvey(id);
        lastSavedDraft.current =
            data.status === "draft"
                ? JSON.stringify(draftBody(id, data))
                : null;
        savedSurveySnapshot.current = JSON.stringify(draftBody(id, data));
        const normalizedData =
            data.status === "draft" && data.questions.length === 0
                ? {
                      ...data,
                      questions: [newQuestion(data.sections[0].id)],
                  }
                : data;
        setSurvey(normalizedData);
        setAnswers(data.mine?.draft || {});
        latestAnswers.current = data.mine?.draft || {};
        setActiveSectionId(
            data.sections.some(
                (section) => section.id === data.mine?.currentSectionId
            )
                ? data.mine?.currentSectionId || data.sections[0]?.id || null
                : data.sections[0]?.id || null
        );
        answerRevision.current += 1;
        setDirty(false);
        setEditing(data.status === "draft");
    }, [id]);

    useEffect(() => {
        if (!focusTarget) return;
        const field = document.querySelector<HTMLElement>(
            `[data-survey-field="${focusTarget.replace(/["\\]/g, "\\$&")}"]`
        );
        const target = field?.matches(
            "input, textarea, select, button, [tabindex]"
        )
            ? field
            : field?.querySelector<HTMLElement>(
                  "input, textarea, select, button"
              );
        target?.focus();
        target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        setFocusTarget(null);
    }, [focusTarget, answerErrors, editorErrors, activeSectionId]);

    useEffect(() => {
        if (!survey) return;
        const hasUnsaved =
            survey.status === "draft"
                ? editorSnapshot !== lastSavedDraft.current
                : hasUnsavedPublishedEdits;
        if (!hasUnsaved) return;
        const preventLeave = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", preventLeave);
        return () => window.removeEventListener("beforeunload", preventLeave);
    }, [editorSnapshot, hasUnsavedPublishedEdits, saveState, survey]);

    const queueDraftSave = useCallback(
        (snapshot: Survey) => {
            const body = draftBody(id, snapshot);
            const serialized = JSON.stringify(body);
            draftPending.current = draftPending.current
                .catch(() => undefined)
                .then(async () => {
                    if (serialized === lastSavedDraft.current) return;
                    await updateSurvey(body);
                    lastSavedDraft.current = serialized;
                });
            return draftPending.current;
        },
        [id]
    );

    useEffect(() => {
        if (!survey || survey.status !== "draft") return;
        if (JSON.stringify(draftBody(id, survey)) === lastSavedDraft.current)
            return;
        draftTimer.current = setTimeout(() => {
            setSaveState("保存中...");
            const snapshot = survey;
            queueDraftSave(snapshot)
                .then(() => {
                    if (latestDraft.current === snapshot)
                        setSaveState("下書きを保存しました");
                })
                .catch(() => {
                    setSaveState(
                        "保存できませんでした。入力はこの画面に残っています"
                    );
                });
        }, 700);
        return () => {
            if (draftTimer.current) clearTimeout(draftTimer.current);
        };
    }, [id, queueDraftSave, survey]);

    useEffect(() => {
        refresh()
            .catch((caught: Error) => setError(caught.message))
            .finally(() => setLoading(false));
    }, [refresh]);

    useEffect(() => {
        if (!showResults) return;
        const interval = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            getSurvey(id)
                .then((updated) =>
                    setSurvey((current) =>
                        current?.id === updated.id
                            ? {
                                  ...current,
                                  responses: updated.responses,
                                  lockedQuestions: updated.lockedQuestions,
                                  lockedOptions: updated.lockedOptions,
                                  open: updated.open,
                                  status: updated.status,
                              }
                            : current
                    )
                )
                .catch(() => undefined);
        }, 15_000);
        return () => clearInterval(interval);
    }, [id, showResults]);

    useEffect(() => {
        if (!dirty || !survey?.open || editing) return;
        timer.current = setTimeout(() => {
            setSaveState("保存中...");
            const snapshot = latestAnswers.current;
            const revision = answerRevision.current;
            pending.current = pending.current
                .catch(() => undefined)
                .then(() =>
                    updateSurvey({
                        action: "draft",
                        id,
                        answers: snapshot,
                        currentSectionId: activeSectionId,
                    })
                );
            pending.current
                .then(() => {
                    if (answerRevision.current === revision)
                        setSaveState("下書きを保存しました");
                })
                .catch(() => {
                    if (answerRevision.current === revision)
                        setSaveState(
                            "保存できませんでした。入力はこの画面に残っています"
                        );
                });
        }, 700);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [activeSectionId, answers, dirty, editing, id, survey?.open]);

    function changeAnswer(questionId: string, value: string | string[]) {
        const next = { ...latestAnswers.current, [questionId]: value };
        latestAnswers.current = next;
        answerRevision.current += 1;
        setAnswers(next);
        setAnswerErrors((current) => {
            const updated = { ...current };
            delete updated[questionId];
            return updated;
        });
        setDirty(true);
        setSaveState("未保存の変更があります");
    }

    async function navigateSection(nextSectionId: string) {
        if (!survey || !activeSectionId) return;
        if (!survey.open) {
            setActiveSectionId(nextSectionId);
            setSectionError("");
            return;
        }
        const movingForward =
            survey.sections.findIndex(
                (section) => section.id === nextSectionId
            ) >
            survey.sections.findIndex(
                (section) => section.id === activeSectionId
            );
        if (movingForward) {
            const currentQuestions = survey.questions.filter(
                (question) => question.sectionId === activeSectionId
            );
            const validation = validateSurveyAnswers(
                currentQuestions,
                latestAnswers.current,
                true
            );
            if (!validation.valid) {
                setAnswerErrors(
                    validation.questionId
                        ? { [validation.questionId]: validation.message }
                        : {}
                );
                setSectionError(
                    validation.questionId ? "" : validation.message
                );
                if (validation.questionId)
                    setFocusTarget(`answer:${validation.questionId}`);
                return;
            }
        }
        setSectionError("");
        setAnswerErrors({});
        if (timer.current) clearTimeout(timer.current);
        setBusy(true);
        try {
            await pending.current.catch(() => undefined);
            await updateSurvey({
                action: "draft",
                id,
                answers: latestAnswers.current,
                currentSectionId: nextSectionId,
            });
            setActiveSectionId(nextSectionId);
            setDirty(false);
            setSaveState("下書きを保存しました");
        } catch (caught) {
            setError((caught as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!survey) return;
        const validation = validateSurveyAnswers(
            survey.questions,
            latestAnswers.current,
            true
        );
        if (!validation.valid) {
            if (validation.questionId) {
                const invalidQuestion = survey.questions.find(
                    (question) => question.id === validation.questionId
                );
                if (invalidQuestion)
                    setActiveSectionId(invalidQuestion.sectionId);
                setAnswerErrors({
                    [validation.questionId]: validation.message,
                });
                setFocusTarget(`answer:${validation.questionId}`);
            } else {
                setSectionError(validation.message);
            }
            return;
        }
        setSectionError("");
        setAnswerErrors({});
        if (timer.current) clearTimeout(timer.current);
        setBusy(true);
        setError("");
        try {
            await pending.current.catch(() => undefined);
            await updateSurvey({
                action: "draft",
                id,
                answers: latestAnswers.current,
                currentSectionId: activeSectionId,
            }).catch(() => undefined);
            await updateSurvey({
                action: "submit",
                id,
                answers: latestAnswers.current,
                currentSectionId: activeSectionId,
            });
            await refresh();
            setSaveState("回答を送信しました");
        } catch (caught) {
            setError((caught as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function saveSurvey(next: Survey, action: "save" | "publish") {
        const nextErrors: Record<string, string> = {};
        if (action === "publish" || next.status === "published") {
            if (!next.title.trim())
                nextErrors.title = "タイトルを入力してください。";
            if (!next.deadlineAt || Date.parse(next.deadlineAt) <= Date.now())
                nextErrors.deadline = "未来の回答締切を設定してください。";
            for (const section of next.sections) {
                if (!section.title.trim())
                    nextErrors[`section-title:${section.id}`] =
                        "セクション名を入力してください。";
                const questions = next.questions.filter(
                    (item) => item.sectionId === section.id
                );
                if (!questions.length)
                    nextErrors[`section-questions:${section.id}`] =
                        "このセクションに質問を1つ以上追加してください。";
                for (const question of questions) {
                    if (!question.label.trim())
                        nextErrors[`question-label:${question.id}`] =
                            "質問文を入力してください。";
                    if (["single", "multiple"].includes(question.type)) {
                        if (question.options.length < 2)
                            nextErrors[`question-options:${question.id}`] =
                                "選択肢を2つ以上追加してください。";
                        for (const [
                            optionIndex,
                            option,
                        ] of question.options.entries()) {
                            if (!option.label.trim())
                                nextErrors[
                                    `option:${question.id}:${option.id}`
                                ] =
                                    `選択肢${optionIndex + 1}を入力してください。`;
                        }
                    }
                }
            }
            setEditorErrors(nextErrors);
            const firstError = Object.keys(nextErrors)[0];
            if (firstError) {
                setFocusTarget(firstError);
                return;
            }
        }
        setBusy(true);
        setError("");
        if (draftTimer.current) clearTimeout(draftTimer.current);
        try {
            await draftPending.current.catch(() => undefined);
            await updateSurvey({ ...draftBody(id, next), action });
            await refresh();
            setSaveState(
                action === "publish" ? "公開しました" : "保存しました"
            );
        } catch (caught) {
            setError((caught as Error).message);
        } finally {
            setBusy(false);
        }
    }

    function clearEditorError(key: string) {
        setEditorErrors((current) => {
            if (!(key in current)) return current;
            const updated = { ...current };
            delete updated[key];
            return updated;
        });
    }

    async function returnToList(event: React.MouseEvent<HTMLAnchorElement>) {
        if (hasUnsavedPublishedEdits) {
            event.preventDefault();
            setConfirmDiscard(true);
            return;
        }
        const draft = latestDraft.current;
        if (
            !draft ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        event.preventDefault();
        if (draftTimer.current) clearTimeout(draftTimer.current);
        setSaveState("保存中...");
        try {
            await queueDraftSave(draft);
            router.push("/surveys");
        } catch {
            setSaveState("保存できませんでした。入力はこの画面に残っています");
        }
    }

    async function closeSurvey() {
        if (!survey) return;
        setBusy(true);
        try {
            await updateSurvey({ action: "close", id });
            setConfirmClose(false);
            await refresh();
        } catch (caught) {
            setError((caught as Error).message);
        } finally {
            setBusy(false);
        }
    }

    if (loading)
        return (
            <main className="mx-auto max-w-4xl p-4 lg:p-6">読み込み中...</main>
        );
    if (!survey)
        return (
            <main className="mx-auto max-w-4xl p-4 lg:p-6">
                <Link
                    href="/surveys"
                    className="link link-primary"
                >
                    アンケート一覧へ
                </Link>
                <p className="alert alert-error mt-4">{error}</p>
            </main>
        );

    const canEdit = survey.canEdit;
    const answered = new Set(survey.lockedQuestions);
    const usedOptions = new Set(survey.lockedOptions);
    const deletingSection = survey.sections.find(
        (section) => section.id === sectionToDelete
    );
    const sectionIndex = survey.sections.findIndex(
        (section) => section.id === sectionToDelete
    );
    const mergeTarget =
        sectionIndex > 0
            ? survey.sections[sectionIndex - 1]
            : survey.sections[sectionIndex + 1];
    const currentSectionIndex = Math.max(
        0,
        survey.sections.findIndex((section) => section.id === activeSectionId)
    );
    const currentSection = survey.sections[currentSectionIndex];
    const visibleQuestions = survey.questions.filter(
        (question) => question.sectionId === currentSection?.id
    );

    function deleteSection(keepQuestions: boolean) {
        if (!survey || !deletingSection || !mergeTarget) return;
        setSurvey({
            ...survey,
            sections: survey.sections.filter(
                (section) => section.id !== deletingSection.id
            ),
            questions: survey.questions.flatMap((question) => {
                if (question.sectionId !== deletingSection.id)
                    return [question];
                return keepQuestions
                    ? [{ ...question, sectionId: mergeTarget.id }]
                    : [];
            }),
        });
        setSectionToDelete(null);
    }

    return (
        <main className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
            <Link
                href="/surveys"
                className="inline-flex items-center gap-2 text-sm text-primary"
                onClick={returnToList}
            >
                <FontAwesomeIcon icon={faArrowLeft} />
                アンケート一覧
            </Link>
            {error && <p className="alert alert-error">{error}</p>}
            <AppModal
                open={confirmClose}
                onClose={() => setConfirmClose(false)}
                ariaLabel="回答の受付を終了"
                boxClassName="max-w-sm p-6"
            >
                <h2 className="text-lg font-bold">
                    回答の受付を終了しますか？
                </h2>
                <p className="mt-2 text-sm text-base-content/70">
                    終了後は回答できません。
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setConfirmClose(false)}
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        className="btn btn-error"
                        disabled={busy}
                        onClick={closeSurvey}
                    >
                        受付を終了
                    </button>
                </div>
            </AppModal>
            <AppModal
                open={confirmDiscard}
                onClose={() => setConfirmDiscard(false)}
                ariaLabel="未保存の変更を破棄"
                boxClassName="max-w-sm p-6"
            >
                <h2 className="text-lg font-bold">
                    保存していない変更を破棄しますか？
                </h2>
                <p className="mt-2 text-sm text-base-content/70">
                    変更を保存せず、編集画面を閉じます。
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setConfirmDiscard(false)}
                    >
                        編集を続ける
                    </button>
                    <button
                        type="button"
                        className="btn btn-error"
                        onClick={() => {
                            setConfirmDiscard(false);
                            refresh().catch((caught: Error) =>
                                setError(caught.message)
                            );
                        }}
                    >
                        変更を破棄
                    </button>
                </div>
            </AppModal>
            <AppModal
                open={!!deletingSection}
                onClose={() => setSectionToDelete(null)}
                ariaLabel="セクションを削除"
                boxClassName="max-w-md p-6"
            >
                <h2 className="text-lg font-bold">
                    セクションを削除しますか？
                </h2>
                <p className="mt-2 text-sm text-base-content/70">
                    {mergeTarget
                        ? `質問を「${mergeTarget.title}」へ移すか、質問ごと削除できます。`
                        : "最後のセクションは削除できません。"}
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setSectionToDelete(null)}
                    >
                        キャンセル
                    </button>
                    {mergeTarget && (
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => deleteSection(true)}
                        >
                            質問を移して削除
                        </button>
                    )}
                    {mergeTarget && (
                        <button
                            type="button"
                            className="btn btn-error"
                            disabled={survey.questions.some(
                                (question) =>
                                    question.sectionId ===
                                        deletingSection?.id &&
                                    answered.has(question.id)
                            )}
                            onClick={() => deleteSection(false)}
                        >
                            質問ごと削除
                        </button>
                    )}
                </div>
            </AppModal>
            {editing && canEdit ? (
                <div className="space-y-6">
                    <div className="space-y-4 border-t-4 border-primary pt-5">
                        <h1 className="text-lg font-semibold">
                            {survey.status === "draft"
                                ? "アンケートを作成"
                                : "アンケートを編集"}
                        </h1>
                        <label className="form-control block">
                            <span className="label-text">タイトル</span>
                            <input
                                className="input input-bordered mt-1 w-full text-lg font-semibold"
                                data-survey-field="title"
                                aria-invalid={!!editorErrors.title}
                                value={survey.title}
                                onChange={(event) => {
                                    clearEditorError("title");
                                    setSurvey({
                                        ...survey,
                                        title: event.target.value,
                                    });
                                }}
                                maxLength={200}
                            />
                            {editorErrors.title && (
                                <span className="mt-1 text-sm text-error">
                                    {editorErrors.title}
                                </span>
                            )}
                        </label>
                        <label className="form-control block">
                            <span className="label-text">説明</span>
                            <textarea
                                className="textarea textarea-bordered mt-1 w-full"
                                rows={2}
                                value={survey.description}
                                onChange={(event) =>
                                    setSurvey({
                                        ...survey,
                                        description: event.target.value,
                                    })
                                }
                                maxLength={5000}
                            />
                        </label>
                    </div>
                    <div className="flex flex-wrap items-end gap-x-8 gap-y-4 pb-6">
                        <label className="form-control block w-full max-w-72">
                            <span className="label-text">回答締切</span>
                            <input
                                type="datetime-local"
                                className="input input-bordered mt-1 w-full"
                                data-survey-field="deadline"
                                aria-invalid={!!editorErrors.deadline}
                                value={localDateTime(survey.deadlineAt)}
                                onChange={(event) => {
                                    clearEditorError("deadline");
                                    setSurvey({
                                        ...survey,
                                        deadlineAt: event.target.value
                                            ? new Date(
                                                  event.target.value
                                              ).toISOString()
                                            : null,
                                    });
                                }}
                            />
                            {editorErrors.deadline && (
                                <span className="mt-1 text-sm text-error">
                                    {editorErrors.deadline}
                                </span>
                            )}
                        </label>
                        <label className="flex min-h-10 items-center gap-3 text-sm">
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={survey.resultsPublic}
                                onChange={(event) =>
                                    setSurvey({
                                        ...survey,
                                        resultsPublic: event.target.checked,
                                    })
                                }
                            />
                            <span>回答結果を部員全員に公開する</span>
                        </label>
                    </div>
                    {/* メタデータ設定とセクション編集の境界を明確にする */}
                    <div className="border-t-2 border-base-300 pt-5" />
                    <div className="space-y-3">
                        {survey.sections.map((section, sectionPosition) => (
                            <div
                                key={section.id}
                                className="space-y-3"
                            >
                                <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-base-content/60">
                                            セクション {sectionPosition + 1}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm ml-auto"
                                            aria-label="セクションを上へ移動"
                                            disabled={
                                                sectionPosition === 0 || busy
                                            }
                                            onClick={() => {
                                                const sections = [
                                                    ...survey.sections,
                                                ];
                                                [
                                                    sections[
                                                        sectionPosition - 1
                                                    ],
                                                    sections[sectionPosition],
                                                ] = [
                                                    sections[sectionPosition],
                                                    sections[
                                                        sectionPosition - 1
                                                    ],
                                                ];
                                                setSurvey({
                                                    ...survey,
                                                    sections,
                                                });
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faArrowUp} />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            aria-label="セクションを下へ移動"
                                            disabled={
                                                sectionPosition ===
                                                    survey.sections.length -
                                                        1 || busy
                                            }
                                            onClick={() => {
                                                const sections = [
                                                    ...survey.sections,
                                                ];
                                                [
                                                    sections[
                                                        sectionPosition + 1
                                                    ],
                                                    sections[sectionPosition],
                                                ] = [
                                                    sections[sectionPosition],
                                                    sections[
                                                        sectionPosition + 1
                                                    ],
                                                ];
                                                setSurvey({
                                                    ...survey,
                                                    sections,
                                                });
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={faArrowDown}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            aria-label="セクションを削除"
                                            disabled={
                                                survey.sections.length <= 1
                                            }
                                            onClick={() =>
                                                setSectionToDelete(section.id)
                                            }
                                        >
                                            <FontAwesomeIcon
                                                icon={faTrash}
                                                className="text-error"
                                            />
                                        </button>
                                    </div>
                                    <input
                                        className="input input-bordered mt-3 w-full text-lg font-semibold"
                                        aria-label={`セクション${sectionPosition + 1}のタイトル`}
                                        data-survey-field={`section-title:${section.id}`}
                                        aria-invalid={
                                            !!editorErrors[
                                                `section-title:${section.id}`
                                            ]
                                        }
                                        placeholder={`セクション${sectionPosition + 1}`}
                                        value={section.title}
                                        maxLength={200}
                                        onChange={(event) => {
                                            clearEditorError(
                                                `section-title:${section.id}`
                                            );
                                            setSurvey({
                                                ...survey,
                                                sections: survey.sections.map(
                                                    (item) =>
                                                        item.id === section.id
                                                            ? {
                                                                  ...item,
                                                                  title: event
                                                                      .target
                                                                      .value,
                                                              }
                                                            : item
                                                ),
                                            });
                                        }}
                                    />
                                    {editorErrors[
                                        `section-title:${section.id}`
                                    ] && (
                                        <p className="mt-1 text-sm text-error">
                                            {
                                                editorErrors[
                                                    `section-title:${section.id}`
                                                ]
                                            }
                                        </p>
                                    )}
                                    <textarea
                                        className="textarea textarea-bordered mt-3 w-full"
                                        aria-label={`セクション${sectionPosition + 1}の説明`}
                                        placeholder="説明（任意）"
                                        rows={2}
                                        value={section.description}
                                        maxLength={2000}
                                        onChange={(event) =>
                                            setSurvey({
                                                ...survey,
                                                sections: survey.sections.map(
                                                    (item) =>
                                                        item.id === section.id
                                                            ? {
                                                                  ...item,
                                                                  description:
                                                                      event
                                                                          .target
                                                                          .value,
                                                              }
                                                            : item
                                                ),
                                            })
                                        }
                                    />
                                </section>
                                {survey.questions.filter(
                                    (question) =>
                                        question.sectionId === section.id
                                ).length === 0 && (
                                    <div>
                                        <p
                                            className="px-4 py-3 text-sm text-base-content/60"
                                            data-survey-field={`section-questions:${section.id}`}
                                            tabIndex={-1}
                                        >
                                            このセクションに質問はありません
                                        </p>
                                        {editorErrors[
                                            `section-questions:${section.id}`
                                        ] && (
                                            <p className="px-4 text-sm text-error">
                                                {
                                                    editorErrors[
                                                        `section-questions:${section.id}`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}
                                {survey.questions
                                    .filter(
                                        (question) =>
                                            question.sectionId === section.id
                                    )
                                    .map((question, sectionQuestionIndex) => {
                                        const index = sectionQuestionIndex;
                                        return (
                                            <section
                                                key={question.id}
                                                data-survey-field={`question-label:${question.id}`}
                                                className="rounded-lg border border-base-300 bg-base-100 p-4 transition-colors focus-within:border-primary sm:p-5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-base-content/60">
                                                        質問 {index + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm ml-auto"
                                                        aria-label={`質問 ${index + 1} の下に追加`}
                                                        title={`質問 ${index + 1} の下に追加`}
                                                        disabled={
                                                            busy ||
                                                            survey.questions
                                                                .length >= 50
                                                        }
                                                        onClick={() =>
                                                            setSurvey({
                                                                ...survey,
                                                                questions:
                                                                    survey.questions.flatMap(
                                                                        (q) =>
                                                                            q.id ===
                                                                            question.id
                                                                                ? [
                                                                                      q,
                                                                                      newQuestion(
                                                                                          question.sectionId
                                                                                      ),
                                                                                  ]
                                                                                : [
                                                                                      q,
                                                                                  ]
                                                                    ),
                                                            })
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faPlus}
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        title="質問を削除"
                                                        disabled={answered.has(
                                                            question.id
                                                        )}
                                                        onClick={() =>
                                                            setSurvey({
                                                                ...survey,
                                                                questions:
                                                                    survey.questions.filter(
                                                                        (q) =>
                                                                            q.id !==
                                                                            question.id
                                                                    ),
                                                            })
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faTrash}
                                                            className="text-error"
                                                        />
                                                    </button>
                                                </div>
                                                <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-start">
                                                    <input
                                                        className="input input-bordered w-full min-w-0 font-medium"
                                                        aria-label={`質問 ${index + 1} の質問文`}
                                                        data-survey-field={`question-label:${question.id}`}
                                                        aria-invalid={
                                                            !!editorErrors[
                                                                `question-label:${question.id}`
                                                            ]
                                                        }
                                                        placeholder="質問文"
                                                        value={question.label}
                                                        disabled={answered.has(
                                                            question.id
                                                        )}
                                                        onChange={(event) => {
                                                            clearEditorError(
                                                                `question-label:${question.id}`
                                                            );
                                                            setSurvey({
                                                                ...survey,
                                                                questions:
                                                                    survey.questions.map(
                                                                        (q) =>
                                                                            q.id ===
                                                                            question.id
                                                                                ? {
                                                                                      ...q,
                                                                                      label: event
                                                                                          .target
                                                                                          .value,
                                                                                  }
                                                                                : q
                                                                    ),
                                                            });
                                                        }}
                                                        maxLength={500}
                                                    />
                                                    <select
                                                        className="select select-bordered w-full"
                                                        aria-label={`質問 ${index + 1} の形式`}
                                                        value={question.type}
                                                        disabled={answered.has(
                                                            question.id
                                                        )}
                                                        onChange={(event) => {
                                                            const type = event
                                                                .target
                                                                .value as QuestionType;
                                                            setSurvey({
                                                                ...survey,
                                                                questions:
                                                                    survey.questions.map(
                                                                        (q) =>
                                                                            q.id ===
                                                                            question.id
                                                                                ? {
                                                                                      ...q,
                                                                                      type,
                                                                                      options:
                                                                                          (type ===
                                                                                              "single" ||
                                                                                              type ===
                                                                                                  "multiple") &&
                                                                                          q
                                                                                              .options
                                                                                              .length ===
                                                                                              0
                                                                                              ? [
                                                                                                    {
                                                                                                        id: crypto.randomUUID(),
                                                                                                        label: "",
                                                                                                    },
                                                                                                    {
                                                                                                        id: crypto.randomUUID(),
                                                                                                        label: "",
                                                                                                    },
                                                                                                ]
                                                                                              : q.options,
                                                                                  }
                                                                                : q
                                                                    ),
                                                            });
                                                        }}
                                                    >
                                                        {questionTypes.map(
                                                            (type) => (
                                                                <option
                                                                    key={
                                                                        type.value
                                                                    }
                                                                    value={
                                                                        type.value
                                                                    }
                                                                >
                                                                    {type.label}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </div>
                                                {editorErrors[
                                                    `question-label:${question.id}`
                                                ] && (
                                                    <p className="mt-1 text-sm text-error">
                                                        {
                                                            editorErrors[
                                                                `question-label:${question.id}`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                                <label className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
                                                    <span className="shrink-0 text-sm text-base-content/70">
                                                        この質問を別のセクションへ移動
                                                    </span>
                                                    <select
                                                        className="select select-bordered select-sm w-full sm:max-w-sm"
                                                        aria-label={`質問 ${index + 1} の移動先`}
                                                        value={
                                                            question.sectionId
                                                        }
                                                        onChange={(event) =>
                                                            setSurvey({
                                                                ...survey,
                                                                questions:
                                                                    survey.questions.map(
                                                                        (
                                                                            item
                                                                        ) =>
                                                                            item.id ===
                                                                            question.id
                                                                                ? {
                                                                                      ...item,
                                                                                      sectionId:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : item
                                                                    ),
                                                            })
                                                        }
                                                    >
                                                        {survey.sections.map(
                                                            (
                                                                target,
                                                                targetIndex
                                                            ) => (
                                                                <option
                                                                    key={
                                                                        target.id
                                                                    }
                                                                    value={
                                                                        target.id
                                                                    }
                                                                >
                                                                    セクション
                                                                    {targetIndex +
                                                                        1}
                                                                    （
                                                                    {target.title ||
                                                                        `セクション${targetIndex + 1}`}
                                                                    ）
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </label>
                                                {(question.type === "single" ||
                                                    question.type ===
                                                        "multiple") && (
                                                    <div
                                                        className="mt-4 space-y-1"
                                                        data-survey-field={`question-options:${question.id}`}
                                                    >
                                                        {question.options.map(
                                                            (
                                                                option,
                                                                optionIndex
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        option.id
                                                                    }
                                                                    className="flex max-w-xl items-center gap-3"
                                                                >
                                                                    <span
                                                                        aria-hidden="true"
                                                                        className={
                                                                            question.type ===
                                                                            "single"
                                                                                ? "size-4 shrink-0 rounded-full border-2 border-base-content/40"
                                                                                : "size-4 shrink-0 rounded border-2 border-base-content/40"
                                                                        }
                                                                    />
                                                                    <input
                                                                        className="input input-ghost min-w-0 flex-1 rounded-none border-0 border-b border-base-300 px-1 focus:border-primary focus:outline-none"
                                                                        aria-label={`選択肢 ${optionIndex + 1}`}
                                                                        data-survey-field={`option:${question.id}:${option.id}`}
                                                                        aria-invalid={
                                                                            !!editorErrors[
                                                                                `option:${question.id}:${option.id}`
                                                                            ]
                                                                        }
                                                                        placeholder={`選択肢 ${optionIndex + 1}`}
                                                                        value={
                                                                            option.label
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) => {
                                                                            clearEditorError(
                                                                                `option:${question.id}:${option.id}`
                                                                            );
                                                                            setSurvey(
                                                                                {
                                                                                    ...survey,
                                                                                    questions:
                                                                                        survey.questions.map(
                                                                                            (
                                                                                                q
                                                                                            ) =>
                                                                                                q.id ===
                                                                                                question.id
                                                                                                    ? {
                                                                                                          ...q,
                                                                                                          options:
                                                                                                              q.options.map(
                                                                                                                  (
                                                                                                                      o
                                                                                                                  ) =>
                                                                                                                      o.id ===
                                                                                                                      option.id
                                                                                                                          ? {
                                                                                                                                ...o,
                                                                                                                                label: event
                                                                                                                                    .target
                                                                                                                                    .value,
                                                                                                                            }
                                                                                                                          : o
                                                                                                              ),
                                                                                                      }
                                                                                                    : q
                                                                                        ),
                                                                                }
                                                                            );
                                                                        }}
                                                                    />
                                                                    <label className="relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-base-content/60 transition-colors hover:bg-base-200 focus-within:ring-2 focus-within:ring-primary">
                                                                        <FontAwesomeIcon
                                                                            icon={
                                                                                faCalendarDays
                                                                            }
                                                                            aria-hidden="true"
                                                                        />
                                                                        <input
                                                                            type="date"
                                                                            className="absolute inset-0 size-full cursor-pointer opacity-0"
                                                                            aria-label={`選択肢 ${optionIndex + 1} の日付を選択`}
                                                                            value={optionDateValue(
                                                                                option.label
                                                                            )}
                                                                            onChange={(
                                                                                event
                                                                            ) => {
                                                                                const value =
                                                                                    event.target.value.replaceAll(
                                                                                        "-",
                                                                                        "/"
                                                                                    );
                                                                                setSurvey(
                                                                                    {
                                                                                        ...survey,
                                                                                        questions:
                                                                                            survey.questions.map(
                                                                                                (
                                                                                                    q
                                                                                                ) =>
                                                                                                    q.id ===
                                                                                                    question.id
                                                                                                        ? {
                                                                                                              ...q,
                                                                                                              options:
                                                                                                                  q.options.map(
                                                                                                                      (
                                                                                                                          o
                                                                                                                      ) =>
                                                                                                                          o.id ===
                                                                                                                          option.id
                                                                                                                              ? {
                                                                                                                                    ...o,
                                                                                                                                    label: value,
                                                                                                                                }
                                                                                                                              : o
                                                                                                                  ),
                                                                                                          }
                                                                                                        : q
                                                                                            ),
                                                                                    }
                                                                                );
                                                                            }}
                                                                        />
                                                                    </label>
                                                                    {editorErrors[
                                                                        `option:${question.id}:${option.id}`
                                                                    ] && (
                                                                        <span className="text-sm text-error">
                                                                            {
                                                                                editorErrors[
                                                                                    `option:${question.id}:${option.id}`
                                                                                ]
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-ghost btn-sm"
                                                                        title="選択肢を削除"
                                                                        disabled={
                                                                            question
                                                                                .options
                                                                                .length <=
                                                                                2 ||
                                                                            usedOptions.has(
                                                                                `${question.id}:${option.id}`
                                                                            )
                                                                        }
                                                                        onClick={() =>
                                                                            setSurvey(
                                                                                {
                                                                                    ...survey,
                                                                                    questions:
                                                                                        survey.questions.map(
                                                                                            (
                                                                                                q
                                                                                            ) =>
                                                                                                q.id ===
                                                                                                question.id
                                                                                                    ? {
                                                                                                          ...q,
                                                                                                          options:
                                                                                                              q.options.filter(
                                                                                                                  (
                                                                                                                      o
                                                                                                                  ) =>
                                                                                                                      o.id !==
                                                                                                                      option.id
                                                                                                              ),
                                                                                                      }
                                                                                                    : q
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                    >
                                                                        <FontAwesomeIcon
                                                                            icon={
                                                                                faTrash
                                                                            }
                                                                            className="text-error"
                                                                        />
                                                                    </button>
                                                                </div>
                                                            )
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            disabled={
                                                                question.options
                                                                    .length >=
                                                                100
                                                            }
                                                            onClick={() =>
                                                                setSurvey({
                                                                    ...survey,
                                                                    questions:
                                                                        survey.questions.map(
                                                                            (
                                                                                q
                                                                            ) =>
                                                                                q.id ===
                                                                                question.id
                                                                                    ? {
                                                                                          ...q,
                                                                                          options:
                                                                                              [
                                                                                                  ...q.options,
                                                                                                  {
                                                                                                      id: crypto.randomUUID(),
                                                                                                      label: "",
                                                                                                  },
                                                                                              ],
                                                                                      }
                                                                                    : q
                                                                        ),
                                                                })
                                                            }
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faPlus}
                                                            />
                                                            選択肢を追加
                                                        </button>
                                                        {editorErrors[
                                                            `question-options:${question.id}`
                                                        ] && (
                                                            <p className="text-sm text-error">
                                                                {
                                                                    editorErrors[
                                                                        `question-options:${question.id}`
                                                                    ]
                                                                }
                                                            </p>
                                                        )}
                                                        {question.options
                                                            .length >= 100 && (
                                                            <p className="text-sm text-base-content/60">
                                                                選択肢は最大100件です
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="mt-4 flex justify-end border-t border-base-200 pt-3">
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-sm"
                                                            checked={
                                                                question.required
                                                            }
                                                            onChange={(event) =>
                                                                setSurvey({
                                                                    ...survey,
                                                                    questions:
                                                                        survey.questions.map(
                                                                            (
                                                                                q
                                                                            ) =>
                                                                                q.id ===
                                                                                question.id
                                                                                    ? {
                                                                                          ...q,
                                                                                          required:
                                                                                              event
                                                                                                  .target
                                                                                                  .checked,
                                                                                      }
                                                                                    : q
                                                                        ),
                                                                })
                                                            }
                                                        />
                                                        必須回答
                                                    </label>
                                                </div>
                                            </section>
                                        );
                                    })}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        disabled={
                                            busy ||
                                            survey.questions.length >= 50
                                        }
                                        onClick={() => {
                                            const newItem = newQuestion(
                                                section.id
                                            );
                                            const lastIndex =
                                                survey.questions.reduce(
                                                    (last, question, index) =>
                                                        question.sectionId ===
                                                        section.id
                                                            ? index
                                                            : last,
                                                    -1
                                                );
                                            const questions = [
                                                ...survey.questions,
                                            ];
                                            questions.splice(
                                                lastIndex + 1,
                                                0,
                                                newItem
                                            );
                                            setSurvey({ ...survey, questions });
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faPlus} />{" "}
                                        質問を追加
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        disabled={
                                            busy || survey.sections.length >= 50
                                        }
                                        onClick={() => {
                                            const added = newSection(
                                                survey.sections.length + 1
                                            );
                                            const sections = [
                                                ...survey.sections,
                                            ];
                                            sections.splice(
                                                sectionPosition + 1,
                                                0,
                                                added
                                            );
                                            setSurvey({ ...survey, sections });
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faPlus} />{" "}
                                        セクションを追加
                                    </button>
                                </div>
                                {sectionPosition <
                                    survey.sections.length - 1 && (
                                    <div className="border-b border-base-300 pb-3" />
                                )}
                            </div>
                        ))}
                    </div>
                    {(survey.questions.length >= 50 ||
                        survey.sections.length >= 50) && (
                        <p className="text-sm text-base-content/60">
                            {survey.questions.length >= 50 &&
                                "質問は最大50件です。"}{" "}
                            {survey.sections.length >= 50 &&
                                "セクションは最大50件です。"}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2 border-t border-base-300 pt-5">
                        {survey.status === "draft" && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy}
                                onClick={() => saveSurvey(survey, "publish")}
                            >
                                公開する
                            </button>
                        )}
                        {survey.status === "published" && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy}
                                onClick={() => saveSurvey(survey, "save")}
                            >
                                変更を保存
                            </button>
                        )}
                        {survey.status !== "draft" && (
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                    if (hasUnsavedPublishedEdits) {
                                        setConfirmDiscard(true);
                                    } else {
                                        refresh().catch((caught: Error) =>
                                            setError(caught.message)
                                        );
                                    }
                                }}
                            >
                                編集をキャンセル
                            </button>
                        )}
                    </div>
                    <SaveStatus message={saveState} />
                </div>
            ) : (
                <>
                    <header className="space-y-2">
                        <h1 className="text-xl font-bold">{survey.title}</h1>
                        {survey.description && (
                            <p className="whitespace-pre-wrap text-base-content/75">
                                {survey.description}
                            </p>
                        )}
                        <p className="text-sm text-base-content/60">
                            締切{" "}
                            {survey.deadlineAt &&
                                new Date(survey.deadlineAt).toLocaleString(
                                    "ja-JP"
                                )}
                        </p>
                        {!survey.open && (
                            <span className="badge badge-outline">
                                受付終了
                            </span>
                        )}
                    </header>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {survey.responses && (
                            <Link
                                href={`/surveys/${id}/responses`}
                                className="btn btn-outline btn-sm"
                            >
                                <FontAwesomeIcon icon={faTable} />
                                回答状況
                            </Link>
                        )}
                        {canEdit && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setEditing(true)}
                                >
                                    編集
                                </button>
                                {survey.open && (
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        disabled={busy}
                                        onClick={() => setConfirmClose(true)}
                                    >
                                        受付を終了
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <form
                        className="space-y-6"
                        onSubmit={submit}
                    >
                        <div className="space-y-2">
                            <p className="text-sm text-base-content/65">
                                セクション {currentSectionIndex + 1} /{" "}
                                {survey.sections.length}
                            </p>
                            <progress
                                className="progress progress-primary w-full"
                                value={currentSectionIndex + 1}
                                max={survey.sections.length}
                            />
                        </div>
                        <header className="space-y-2 border-t-4 border-primary bg-base-100 px-5 py-4">
                            <h2 className="text-lg font-bold">
                                {currentSection?.title}
                            </h2>
                            {currentSection?.description && (
                                <p className="whitespace-pre-wrap text-sm text-base-content/75">
                                    {currentSection.description}
                                </p>
                            )}
                        </header>
                        {visibleQuestions.map((question, index) => (
                            <section
                                key={question.id}
                                data-survey-field={`answer:${question.id}`}
                                className="border-t border-base-300 pt-5"
                            >
                                <h2 className="mb-3 font-semibold">
                                    {index + 1}. {question.label}
                                    {question.required && (
                                        <span className="ml-2 text-error">
                                            *
                                        </span>
                                    )}
                                </h2>
                                <QuestionInput
                                    question={question}
                                    value={answers[question.id]}
                                    disabled={!survey.open || busy}
                                    error={answerErrors[question.id]}
                                    onChange={(value) =>
                                        changeAnswer(question.id, value)
                                    }
                                />
                            </section>
                        ))}
                        {sectionError && (
                            <p className="alert alert-error">{sectionError}</p>
                        )}
                        <div className="flex flex-wrap justify-between gap-2 border-t border-base-300 pt-4">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                disabled={currentSectionIndex === 0 || busy}
                                onClick={() =>
                                    navigateSection(
                                        survey.sections[currentSectionIndex - 1]
                                            .id
                                    )
                                }
                            >
                                前へ
                            </button>
                            {currentSectionIndex <
                            survey.sections.length - 1 ? (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={busy}
                                    onClick={() =>
                                        navigateSection(
                                            survey.sections[
                                                currentSectionIndex + 1
                                            ].id
                                        )
                                    }
                                >
                                    次へ
                                </button>
                            ) : survey.open ? (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={busy}
                                >
                                    {busy
                                        ? "送信中..."
                                        : survey.mine?.submitted
                                          ? "回答を更新して送信"
                                          : "回答を送信"}
                                </button>
                            ) : (
                                <span className="self-center text-sm text-base-content/60">
                                    回答の受付は終了しました
                                </span>
                            )}
                        </div>
                    </form>
                    <SaveStatus message={saveState} />
                    {survey.responses && (
                        <section className="border-t border-base-300 pt-6">
                            <h2 className="mb-4 text-lg font-bold">
                                回答結果{" "}
                                <span className="badge badge-primary ml-2">
                                    {survey.responses.length}
                                </span>
                            </h2>
                            <div className="space-y-6">
                                {survey.sections.map(
                                    (section, sectionIndex) => (
                                        <section
                                            key={section.id}
                                            className="space-y-3"
                                        >
                                            <h3 className="border-b border-base-300 pb-2 font-bold">
                                                セクション {sectionIndex + 1}:{" "}
                                                {section.title}
                                            </h3>
                                            {survey.questions
                                                .filter(
                                                    (question) =>
                                                        question.sectionId ===
                                                        section.id
                                                )
                                                .map((q) => (
                                                    <div key={q.id}>
                                                        <h4 className="font-semibold">
                                                            {q.label}
                                                        </h4>
                                                        {(q.type === "single" ||
                                                            q.type ===
                                                                "multiple") && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {q.options.map(
                                                                    (
                                                                        option
                                                                    ) => (
                                                                        <span
                                                                            key={
                                                                                option.id
                                                                            }
                                                                            className="badge badge-outline"
                                                                        >
                                                                            {
                                                                                option.label
                                                                            }{" "}
                                                                            {
                                                                                survey.responses!.filter(
                                                                                    (
                                                                                        response
                                                                                    ) => {
                                                                                        const answer =
                                                                                            response
                                                                                                .answers[
                                                                                                q
                                                                                                    .id
                                                                                            ];
                                                                                        return Array.isArray(
                                                                                            answer
                                                                                        )
                                                                                            ? answer.includes(
                                                                                                  option.id
                                                                                              )
                                                                                            : answer ===
                                                                                                  option.id;
                                                                                    }
                                                                                )
                                                                                    .length
                                                                            }
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </section>
                                    )
                                )}
                            </div>
                            <h3 className="mb-2 mt-6 font-semibold">
                                回答一覧
                            </h3>
                            <div className="divide-y divide-base-300 border-y border-base-300">
                                {survey.responses.map((response) => (
                                    <div
                                        key={response.studentId}
                                        className="py-3"
                                    >
                                        <p className="font-medium">
                                            {response.name}
                                        </p>
                                        {survey.sections.map((section) => (
                                            <div
                                                key={section.id}
                                                className="mt-3"
                                            >
                                                <p className="font-semibold">
                                                    {section.title}
                                                </p>
                                                {survey.questions
                                                    .filter(
                                                        (question) =>
                                                            question.sectionId ===
                                                            section.id
                                                    )
                                                    .map((q) => {
                                                        const value =
                                                            response.answers[
                                                                q.id
                                                            ];
                                                        const labels =
                                                            Array.isArray(value)
                                                                ? value
                                                                      .map(
                                                                          (
                                                                              id
                                                                          ) =>
                                                                              q.options.find(
                                                                                  (
                                                                                      o
                                                                                  ) =>
                                                                                      o.id ===
                                                                                      id
                                                                              )
                                                                                  ?.label ||
                                                                              id
                                                                      )
                                                                      .join(
                                                                          "、"
                                                                      )
                                                                : q.options.find(
                                                                      (o) =>
                                                                          o.id ===
                                                                          value
                                                                  )?.label ||
                                                                  value;
                                                        return (
                                                            <p
                                                                key={q.id}
                                                                className="mt-1 text-sm"
                                                            >
                                                                <span className="text-base-content/60">
                                                                    {q.label}
                                                                    :{" "}
                                                                </span>
                                                                {labels ||
                                                                    "未回答"}
                                                            </p>
                                                        );
                                                    })}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </main>
    );
}
