import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/shared/lib/use-url-modal", async () => {
    const React = await import("react");
    return {
        useUrlModal: () => {
            const [modal, setModal] = React.useState<string | null>(null);
            const [taskId, setTaskId] = React.useState<string | null>(null);
            return {
                modal,
                getModalParam: (key: string) => (key === "task" ? taskId : null),
                openModal: (
                    name: string,
                    params?: Record<string, string | null>
                ) => {
                    setTaskId(params?.task || null);
                    setModal(name);
                },
                closeModal: () => {
                    setModal(null);
                    setTaskId(null);
                },
            };
        },
    };
});

import TasksClient from "./TasksClient";

const task = {
    id: "TASK-001",
    title: "会議資料を作る",
    description: "議題を整理する",
    status: "TODO" as const,
    dueDate: "2026-09-01",
    createdAt: "2026-08-20T00:00:00+09:00",
    updatedAt: "2026-08-20T00:00:00+09:00",
    assignees: [
        {
            studentNumber: "a123456",
            name: "放研 太郎",
            displayName: "たろう",
        },
    ],
};

const membersData = {
    headers: ["studentNumber", "name", "nickname"],
    members: [
        { rowNumber: 2, values: ["a123456", "放研 太郎", "たろう"] },
        { rowNumber: 3, values: ["b234567", "放研 花子", "はな"] },
    ],
};

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("TasksClient", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: [task] }))
            .mockResolvedValueOnce(
                jsonResponse({ success: true, data: membersData })
            );
    });

    it("タスクと進捗、現在ユーザーの担当表示を読み込む", async () => {
        render(<TasksClient currentStudentId="A123456" />);

        expect(await screen.findByText("会議資料を作る")).toBeInTheDocument();
        expect(screen.getByText("0/1 完了")).toBeInTheDocument();
        expect(screen.getByText("たろう")).toHaveClass("badge-primary");
        expect(fetch).toHaveBeenNthCalledWith(1, "/api/tasks", {
            cache: "no-store",
        });
    });

    it("担当者を選んでタスクを追加し、成功後に一覧とモーダルを更新する", async () => {
        const created = { ...task, id: "TASK-002", title: "新しいタスク" };
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [task, created] })
        );
        render(<TasksClient currentStudentId="a123456" />);
        await screen.findByText("会議資料を作る");

        fireEvent.click(screen.getByRole("button", { name: "タスクを追加" }));
        const dialog = screen.getByRole("dialog", { name: "タスクを追加" });
        fireEvent.change(within(dialog).getByLabelText("タイトル"), {
            target: { value: "新しいタスク" },
        });
        fireEvent.change(within(dialog).getByLabelText("説明"), {
            target: { value: "内容" },
        });
        const assignees = within(dialog).getAllByRole("checkbox");
        fireEvent.click(assignees[1]);
        fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

        await waitFor(() => {
            const options = vi.mocked(fetch).mock.calls[2][1] as RequestInit;
            expect(JSON.parse(String(options.body))).toEqual({
                title: "新しいタスク",
                description: "内容",
                status: "TODO",
                dueDate: "",
                assigneeStudentNumbers: ["b234567"],
            });
        });
        await waitFor(() =>
            expect(
                screen.queryByRole("dialog", { name: "タスクを追加" })
            ).toBeNull()
        );
        expect(screen.getByText("新しいタスク").closest("article")).toHaveAttribute(
            "data-motion",
            "enter"
        );
    });

    it("確認後にタスクを削除し、一覧から取り除く", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));
        render(<TasksClient currentStudentId="a123456" />);
        await screen.findByText("会議資料を作る");

        fireEvent.click(screen.getByRole("button", { name: "削除" }));
        const dialog = screen.getByRole("dialog", { name: "タスクを削除" });
        fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

        await waitFor(() =>
            expect(fetch).toHaveBeenNthCalledWith(3, "/api/tasks", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: "TASK-001" }),
            })
        );
        expect(
            screen
                .getByRole("heading", { name: "会議資料を作る" })
                .closest("article")
        ).toHaveAttribute("data-motion", "exit");
        await waitFor(() =>
            expect(screen.queryByText("会議資料を作る")).toBeNull()
        );
        expect(screen.getByText("タスクはまだありません")).toBeInTheDocument();
    });
});
