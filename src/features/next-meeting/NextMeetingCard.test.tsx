import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    updateNextMeeting: vi.fn(),
    announceNextMeeting: vi.fn(),
}));

vi.mock("@/src/shared/api", () => ({
    updateNextMeeting: mocks.updateNextMeeting,
    announceNextMeeting: mocks.announceNextMeeting,
}));
vi.mock("@/src/shared/lib/use-url-modal", async () => {
    const React = await import("react");
    return {
        useUrlModal: () => {
            const [modal, setModal] = React.useState<string | null>(null);
            return {
                modal,
                openModal: (name: string) => setModal(name),
                closeModal: () => setModal(null),
            };
        },
    };
});

import { NextMeetingCard } from "./NextMeetingCard";

const initialMeeting = {
    date: "2026-09-01",
    time: "18:00",
    mode: "IN_PERSON" as const,
    updatedAt: "2026-08-28T12:34:56+09:00",
    updatedByName: "部長 太郎",
};

describe("NextMeetingCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.updateNextMeeting.mockResolvedValue({
            success: true,
            data: initialMeeting,
        });
        mocks.announceNextMeeting.mockResolvedValue({ success: true });
    });

    it("一般部員には編集・送信操作を表示しない", () => {
        render(
            <NextMeetingCard
                initialMeeting={initialMeeting}
                permission="NORMAL"
            />
        );

        expect(screen.getByText("2026/09/01(火) 18:00 対面")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
        expect(screen.queryByRole("button", { name: "送信" })).toBeNull();
    });

    it("更新成功後にモーダルを閉じ、表示内容を更新する", async () => {
        mocks.updateNextMeeting.mockResolvedValueOnce({
            success: true,
            data: {
                date: "2026-09-08",
                time: "19:30",
                mode: "DISCORD",
            },
        });
        render(
            <NextMeetingCard
                initialMeeting={initialMeeting}
                permission="HEAD"
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "編集" }));
        const dialog = screen.getByRole("dialog", { name: "次回部会を編集" });
        const inputs = dialog.querySelectorAll("input");
        fireEvent.change(inputs[0], { target: { value: "2026-09-08" } });
        fireEvent.change(inputs[1], { target: { value: "19:30" } });
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "DISCORD" },
        });
        fireEvent.click(screen.getByRole("button", { name: "保存" }));

        await waitFor(() =>
            expect(mocks.updateNextMeeting).toHaveBeenCalledWith({
                date: "2026-09-08",
                time: "19:30",
                mode: "DISCORD",
            })
        );
        await waitFor(() =>
            expect(
                screen.queryByRole("dialog", { name: "次回部会を編集" })
            ).toBeNull()
        );
        expect(screen.getByText("2026/09/08(火) 19:30 Discord")).toBeInTheDocument();
        expect(screen.getByText("次回部会を更新しました")).toBeInTheDocument();
    });

    it("更新失敗時はモーダルと入力を維持してエラーを表示する", async () => {
        mocks.updateNextMeeting.mockResolvedValueOnce({
            success: false,
            error: "更新できません",
        });
        render(
            <NextMeetingCard
                initialMeeting={initialMeeting}
                permission="HEAD"
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "編集" }));
        fireEvent.click(screen.getByRole("button", { name: "保存" }));

        expect(await screen.findByText("更新できません")).toBeInTheDocument();
        expect(
            screen.getByRole("dialog", { name: "次回部会を編集" })
        ).toBeInTheDocument();
    });

    it("確認後にDiscord告知を送信してモーダルを閉じる", async () => {
        render(
            <NextMeetingCard
                initialMeeting={initialMeeting}
                permission="SUB_HEAD"
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "送信" }));
        expect(
            screen.getByRole("dialog", { name: "次回部会連絡を送信" })
        ).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "送信する" }));

        await waitFor(() =>
            expect(mocks.announceNextMeeting).toHaveBeenCalledTimes(1)
        );
        await waitFor(() =>
            expect(
                screen.queryByRole("dialog", { name: "次回部会連絡を送信" })
            ).toBeNull()
        );
        expect(
            screen.getByText("次回部会連絡をDiscordに送信しました")
        ).toBeInTheDocument();
    });
});
