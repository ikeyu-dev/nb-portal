import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
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
                replaceModal: (name: string) => setModal(name),
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

    it("予定一覧と同じくカードから詳細モーダルを開く", () => {
        render(
            <NextMeetingCard
                initialMeeting={initialMeeting}
                permission="NORMAL"
            />
        );

        expect(screen.getByText("9/1(火) 18:00")).toBeInTheDocument();
        expect(screen.getByText("対面")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
        expect(
            screen.queryByRole("button", { name: "Discordへ即時送信" })
        ).toBeNull();

        fireEvent.click(
            screen.getByRole("button", { name: "次回部会の詳細を開く" })
        );

        expect(
            screen.getByRole("dialog", { name: "次回部会" })
        ).toBeInTheDocument();
        expect(screen.getByText("更新: 2026/08/28 12:34:56 / 部長 太郎"))
            .toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
    });

    it("管理者は詳細モーダルから編集し、成功後にモーダルを閉じる", async () => {
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

        expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
        fireEvent.click(
            screen.getByRole("button", { name: "次回部会の詳細を開く" })
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
        const trigger = screen.getByRole("button", {
            name: "次回部会の詳細を開く",
        });
        expect(within(trigger).getByText("9/8(火) 19:30"))
            .toBeInTheDocument();
        expect(within(trigger).getByText("Discord")).toBeInTheDocument();
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

        fireEvent.click(
            screen.getByRole("button", { name: "次回部会の詳細を開く" })
        );
        fireEvent.click(screen.getByRole("button", { name: "編集" }));
        fireEvent.click(screen.getByRole("button", { name: "保存" }));

        expect(await screen.findByText("更新できません")).toBeInTheDocument();
        expect(
            screen.getByRole("dialog", { name: "次回部会を編集" })
        ).toBeInTheDocument();
    });

    it("管理者は詳細モーダルからDiscordへ即時送信できる", async () => {
        render(
            <NextMeetingCard
                initialMeeting={initialMeeting}
                permission="SUB_HEAD"
            />
        );

        fireEvent.click(
            screen.getByRole("button", { name: "次回部会の詳細を開く" })
        );
        fireEvent.click(
            screen.getByRole("button", { name: "Discordへ即時送信" })
        );
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

    it("次回部会が未設定の場合は即時送信できない", () => {
        render(
            <NextMeetingCard initialMeeting={null} permission="ACCOUNTANT" />
        );

        fireEvent.click(
            screen.getByRole("button", { name: "次回部会の詳細を開く" })
        );

        expect(
            screen.getByRole("button", { name: "Discordへ即時送信" })
        ).toBeDisabled();
        expect(screen.getByRole("button", { name: "編集" })).toBeEnabled();
    });
});
