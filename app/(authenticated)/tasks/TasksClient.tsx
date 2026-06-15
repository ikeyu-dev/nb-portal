"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCheck,
    faCirclePlus,
    faPen,
    faTrash,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
import type {
    ApiResponse,
    MembersData,
    Task,
    TaskStatus,
} from "@/src/shared/types/api";
import { TASK_STATUS_LABELS } from "@/src/shared/types/api";
import { useUrlModal } from "@/src/shared/lib/use-url-modal";

type MemberOption = {
    studentNumber: string;
    displayName: string;
};

type TaskFormState = {
    id?: string;
    title: string;
    description: string;
    status: TaskStatus;
    dueDate: string;
    assigneeStudentNumbers: string[];
};

type TasksClientProps = {
    currentStudentId: string | null;
};

const emptyForm: TaskFormState = {
    title: "",
    description: "",
    status: "TODO",
    dueDate: "",
    assigneeStudentNumbers: [],
};

const statusBadgeClass: Record<TaskStatus, string> = {
    TODO: "badge-ghost",
    IN_PROGRESS: "badge-info",
    DONE: "badge-success",
};

const statusOrder: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

const normalizeStudentNumber = (value: string | null | undefined) =>
    String(value ?? "").trim().toLowerCase();

const formatDate = (value?: string | null) => {
    if (!value) return "期限なし";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
};

const resolveMembers = (data: MembersData | undefined): MemberOption[] => {
    if (!data) return [];
    return data.members
        .map((member) => {
            const studentNumber = String(member.values[0] ?? "").trim();
            const name = String(member.values[1] ?? "").trim();
            const nickname = String(member.values[2] ?? "").trim();
            const displayName =
                nickname && nickname !== "---" ? nickname : name || studentNumber;
            return { studentNumber, displayName };
        })
        .filter((member) => member.studentNumber && member.displayName);
};

export default function TasksClient({ currentStudentId }: TasksClientProps) {
    const { searchParams, updateUrlModal, clearUrlModal } = useUrlModal();
    const urlModalQuery = searchParams.toString();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<MemberOption[]>([]);
    const [form, setForm] = useState<TaskFormState>(emptyForm);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [deleteTargetTask, setDeleteTargetTask] = useState<Task | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const progress = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter((task) => task.status === "DONE").length;
        return {
            total,
            done,
            percent: total === 0 ? 0 : Math.round((done / total) * 100),
        };
    }, [tasks]);

    const currentStudentNumber = useMemo(
        () => normalizeStudentNumber(currentStudentId),
        [currentStudentId]
    );

    const groupedTasks = useMemo(
        () =>
            statusOrder.map((status) => ({
                status,
                tasks: tasks.filter((task) => task.status === status),
            })),
        [tasks]
    );

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [tasksResponse, membersResponse] = await Promise.all([
                fetch("/api/tasks", { cache: "no-store" }),
                fetch("/api/backend?path=members", { cache: "no-store" }),
            ]);
            const tasksData = (await tasksResponse.json()) as ApiResponse<Task[]>;
            const membersData =
                (await membersResponse.json()) as ApiResponse<MembersData>;

            if (!tasksData.success) {
                throw new Error(tasksData.error || "タスクの取得に失敗しました");
            }
            if (!membersData.success) {
                throw new Error(membersData.error || "名簿の取得に失敗しました");
            }

            setTasks(tasksData.data || []);
            setMembers(resolveMembers(membersData.data));
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "データの取得に失敗しました"
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const params = new URLSearchParams(urlModalQuery);
        const modal = params.get("modal");
        const taskId = params.get("task");
        if (modal === "task-create") {
            setForm(emptyForm);
            setError(null);
            setSuccessMessage(null);
            setDeleteTargetTask(null);
            setIsTaskModalOpen(true);
            return;
        }

        if ((modal === "task-edit" || modal === "task-delete") && taskId) {
            const task = tasks.find((item) => item.id === taskId);
            if (!task) return;

            setError(null);
            setSuccessMessage(null);
            if (modal === "task-edit") {
                setDeleteTargetTask(null);
                setForm({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    dueDate: task.dueDate || "",
                    assigneeStudentNumbers: task.assignees.map(
                        (assignee) => assignee.studentNumber
                    ),
                });
                setIsTaskModalOpen(true);
            } else {
                setIsTaskModalOpen(false);
                setDeleteTargetTask(task);
            }
        }
    }, [isLoading, tasks, urlModalQuery]);

    const resetForm = () => {
        setForm(emptyForm);
        setSuccessMessage(null);
    };

    const openCreateTaskModal = () => {
        setForm(emptyForm);
        setError(null);
        setSuccessMessage(null);
        setIsTaskModalOpen(true);
        updateUrlModal({ modal: "task-create", task: null });
    };

    const closeTaskModal = () => {
        setIsTaskModalOpen(false);
        resetForm();
        clearUrlModal(["task"]);
    };

    const openDeleteTaskModal = (task: Task) => {
        setDeleteTargetTask(task);
        setError(null);
        setSuccessMessage(null);
        updateUrlModal({ modal: "task-delete", task: task.id });
    };

    const closeDeleteTaskModal = () => {
        if (isDeleting) return;
        setDeleteTargetTask(null);
        clearUrlModal(["task"]);
    };

    const toggleAssignee = (studentNumber: string) => {
        setForm((current) => {
            const exists = current.assigneeStudentNumbers.includes(studentNumber);
            return {
                ...current,
                assigneeStudentNumbers: exists
                    ? current.assigneeStudentNumbers.filter(
                          (value) => value !== studentNumber
                      )
                    : [...current.assigneeStudentNumbers, studentNumber],
            };
        });
    };

    const submitTask = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = (await response.json()) as ApiResponse<Task[]>;
            if (!response.ok || !data.success) {
                throw new Error(data.error || "タスクの保存に失敗しました");
            }

            setTasks(data.data || []);
            setSuccessMessage(form.id ? "タスクを更新しました" : "タスクを追加しました");
            setIsTaskModalOpen(false);
            resetForm();
            clearUrlModal(["task"]);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "タスクの保存に失敗しました"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const editTask = (task: Task) => {
        setForm({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            dueDate: task.dueDate || "",
            assigneeStudentNumbers: task.assignees.map(
                (assignee) => assignee.studentNumber
            ),
        });
        setSuccessMessage(null);
        setError(null);
        setIsTaskModalOpen(true);
        updateUrlModal({ modal: "task-edit", task: task.id });
    };

    const updateTaskStatus = async (task: Task, status: TaskStatus) => {
        setError(null);
        const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: task.id,
                title: task.title,
                description: task.description,
                status,
                dueDate: task.dueDate || "",
                assigneeStudentNumbers: task.assignees.map(
                    (assignee) => assignee.studentNumber
                ),
            }),
        });
        const data = (await response.json()) as ApiResponse<Task[]>;
        if (data.success) {
            setTasks(data.data || []);
        } else {
            setError(data.error || "ステータス更新に失敗しました");
        }
    };

    const deleteTask = async () => {
        if (!deleteTargetTask) return;
        setError(null);
        setSuccessMessage(null);
        setIsDeleting(true);

        try {
            const response = await fetch("/api/tasks", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deleteTargetTask.id }),
            });
            const data = (await response.json()) as ApiResponse<null>;
            if (!response.ok || !data.success) {
                throw new Error(data.error || "タスク削除に失敗しました");
            }

            setTasks((current) =>
                current.filter((task) => task.id !== deleteTargetTask.id)
            );
            setDeleteTargetTask(null);
            setSuccessMessage("タスクを削除しました");
            clearUrlModal(["task"]);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "タスク削除に失敗しました"
            );
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    return (
        <>
            <section className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="card-title text-base">進捗状況</h2>
                            <span className="badge badge-primary badge-outline">
                                {progress.done}/{progress.total} 完了
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm gap-2"
                            onClick={openCreateTaskModal}
                        >
                            <FontAwesomeIcon icon={faCirclePlus} />
                            タスクを追加
                        </button>
                    </div>
                    <progress
                        className="progress progress-primary w-full"
                        value={progress.percent}
                        max={100}
                    />

                    {tasks.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-base-300 py-12 text-center text-base-content/60">
                            タスクはまだありません
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                            {groupedTasks.map((group) => (
                                <div key={group.status} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`badge ${statusBadgeClass[group.status]}`}
                                        >
                                            {TASK_STATUS_LABELS[group.status]}
                                        </span>
                                        <span className="text-sm text-base-content/50">
                                            {group.tasks.length}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {group.tasks.map((task) => (
                                            <article
                                                key={task.id}
                                                className="rounded-lg border border-base-300 bg-base-200/40 p-4"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold leading-snug">
                                                            {task.title}
                                                        </h3>
                                                        {task.assignees.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                {task.assignees.map(
                                                                    (assignee) => (
                                                                        <span
                                                                            key={
                                                                                assignee.studentNumber
                                                                            }
                                                                            className={`badge badge-sm ${
                                                                                normalizeStudentNumber(
                                                                                    assignee.studentNumber
                                                                                ) ===
                                                                                currentStudentNumber
                                                                                    ? "badge-primary"
                                                                                    : "badge-outline"
                                                                            }`}
                                                                        >
                                                                            {
                                                                                assignee.displayName
                                                                            }
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                        {task.description && (
                                                            <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/70">
                                                                {task.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-xs"
                                                            onClick={() =>
                                                                editTask(task)
                                                            }
                                                            aria-label="編集"
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faPen}
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-xs text-error"
                                                            onClick={() =>
                                                                openDeleteTaskModal(
                                                                    task
                                                                )
                                                            }
                                                            aria-label="削除"
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faTrash}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-3 text-xs text-base-content/60">
                                                    期限: {formatDate(task.dueDate)}
                                                </div>

                                                <div className="mt-3 grid grid-cols-3 gap-1">
                                                    {statusOrder.map((status) => (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            className={`btn btn-xs ${
                                                                task.status ===
                                                                status
                                                                    ? "btn-primary"
                                                                    : "btn-ghost"
                                                            }`}
                                                            onClick={() =>
                                                                void updateTaskStatus(
                                                                    task,
                                                                    status
                                                                )
                                                            }
                                                        >
                                                            {
                                                                TASK_STATUS_LABELS[
                                                                    status
                                                                ]
                                                            }
                                                        </button>
                                                    ))}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {isTaskModalOpen && (
                <dialog className="modal modal-open modal-middle">
                    <div className="modal-box max-w-2xl max-h-[calc(100vh-5rem)] overflow-y-auto">
                        <form className="space-y-4" onSubmit={submitTask}>
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon
                                    icon={faCirclePlus}
                                    className="text-lg text-primary"
                                />
                                <h2 className="font-bold text-lg">
                                    {form.id ? "タスクを編集" : "タスクを追加"}
                                </h2>
                            </div>

                            <label className="form-control">
                                <span className="label-text text-sm">
                                    タイトル
                                </span>
                                <input
                                    className="input input-bordered w-full"
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            title: event.target.value,
                                        }))
                                    }
                                    required
                                    maxLength={100}
                                    autoFocus
                                />
                            </label>

                            <label className="form-control">
                                <span className="label-text text-sm">説明</span>
                                <textarea
                                    className="textarea textarea-bordered min-h-24 w-full"
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            description: event.target.value,
                                        }))
                                    }
                                    maxLength={1000}
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="form-control">
                                    <span className="label-text text-sm">
                                        状態
                                    </span>
                                    <select
                                        className="select select-bordered w-full"
                                        value={form.status}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                status: event.target
                                                    .value as TaskStatus,
                                            }))
                                        }
                                    >
                                        {statusOrder.map((status) => (
                                            <option key={status} value={status}>
                                                {TASK_STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="form-control">
                                    <span className="label-text text-sm">
                                        期限
                                    </span>
                                    <input
                                        type="date"
                                        className="input input-bordered w-full"
                                        value={form.dueDate}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                dueDate: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            <div className="rounded-lg border border-base-300 p-3">
                                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                                    <FontAwesomeIcon icon={faUsers} />
                                    担当者
                                </div>
                                <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-1 gap-2">
                                    {members.map((member) => (
                                        <label
                                            key={member.studentNumber}
                                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-base-200"
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary checkbox-sm"
                                                checked={form.assigneeStudentNumbers.includes(
                                                    member.studentNumber
                                                )}
                                                onChange={() =>
                                                    toggleAssignee(
                                                        member.studentNumber
                                                    )
                                                }
                                            />
                                            <span className="min-w-0 truncate text-sm">
                                                {member.displayName}
                                            </span>
                                            <span className="ml-auto shrink-0 font-mono text-xs text-base-content/50">
                                                {member.studentNumber}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="alert alert-error">{error}</div>
                            )}
                            {successMessage && (
                                <div className="alert alert-success">
                                    {successMessage}
                                </div>
                            )}

                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={closeTaskModal}
                                    disabled={isSubmitting}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary gap-2"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="loading loading-spinner loading-sm" />
                                    ) : (
                                        <FontAwesomeIcon icon={faCheck} />
                                    )}
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={closeTaskModal}>
                            閉じる
                        </button>
                    </form>
                </dialog>
            )}

            {deleteTargetTask && (
                <dialog className="modal modal-open modal-middle">
                    <div className="modal-box">
                        <div className="flex items-center gap-2">
                            <FontAwesomeIcon
                                icon={faTrash}
                                className="text-lg text-error"
                            />
                            <h2 className="font-bold text-lg">タスクを削除</h2>
                        </div>
                        <p className="mt-4 text-sm text-base-content/70">
                            このタスクを削除します。削除したタスクは元に戻せません。
                        </p>
                        <div className="mt-4 rounded-lg border border-base-300 bg-base-200/50 p-3">
                            <div className="font-semibold leading-snug">
                                {deleteTargetTask.title}
                            </div>
                            {deleteTargetTask.description && (
                                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-base-content/60">
                                    {deleteTargetTask.description}
                                </p>
                            )}
                        </div>
                        {error && (
                            <div className="alert alert-error mt-4">{error}</div>
                        )}
                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={closeDeleteTaskModal}
                                disabled={isDeleting}
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                className="btn btn-error gap-2"
                                onClick={() => void deleteTask()}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    <FontAwesomeIcon icon={faTrash} />
                                )}
                                削除
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={closeDeleteTaskModal}>
                            閉じる
                        </button>
                    </form>
                </dialog>
            )}
        </>
    );
}
