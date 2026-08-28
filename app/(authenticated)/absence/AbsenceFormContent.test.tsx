import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ submitAbsence: vi.fn() }));
let currentQuery = "";

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(currentQuery),
}));
vi.mock("@/src/shared/api/client", () => ({
    submitAbsence: mocks.submitAbsence,
}));
vi.mock("@/src/features/help", () => ({
    HelpButton: () => <button type="button">ヘルプ</button>,
}));

import { AbsenceFormContent } from "./AbsenceFormContent";

describe("AbsenceFormContent", () => {
    beforeEach(() => {
        currentQuery = "eventId=EVENT-001";
        vi.clearAllMocks();
        mocks.submitAbsence.mockResolvedValue({ success: true });
    });

    it("欠席連絡の初期値にログインユーザー情報を使う", () => {
        render(
            <AbsenceFormContent
                studentId="a123456"
                memberName="放研 太郎"
            />
        );

        expect(screen.getByRole("heading", { name: "欠席連絡" })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("例: 12345678")).toHaveValue("a123456");
        expect(screen.getByPlaceholderText("例: 山田 太郎")).toHaveValue(
            "放研 太郎"
        );
        expect(screen.getAllByRole("combobox")).toHaveLength(2);
    });

    it("中抜けの時刻を含めて欠席連絡を送信し、成功後に入力をリセットする", async () => {
        render(
            <AbsenceFormContent
                studentId="a123456"
                memberName="放研 太郎"
            />
        );
        const selects = screen.getAllByRole("combobox");
        fireEvent.change(selects[0], { target: { value: "中抜け" } });
        fireEvent.change(selects[1], { target: { value: "授業" } });
        fireEvent.change(screen.getByPlaceholderText("補足があれば入力してください"), {
            target: { value: "4限のみ参加" },
        });
        const timeInputs = document.querySelectorAll('input[type="time"]');
        fireEvent.change(timeInputs[0], { target: { value: "15:00" } });
        fireEvent.change(timeInputs[1], { target: { value: "16:30" } });

        fireEvent.click(screen.getByRole("button", { name: "欠席連絡を送信" }));

        await waitFor(() =>
            expect(mocks.submitAbsence).toHaveBeenCalledWith({
                eventId: "EVENT-001",
                studentNumber: "a123456",
                name: "放研 太郎",
                type: "中抜け",
                reason: "授業",
                reasonDetail: "4限のみ参加",
                timeStepOut: "15:00",
                timeReturn: "16:30",
                timeLeavingEarly: undefined,
            })
        );
        expect(await screen.findByText("欠席連絡を送信しました")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("例: 12345678")).toHaveValue("a123456");
        expect(screen.getAllByRole("combobox")[0]).toHaveValue("");
    });

    it("希望者参加では出席として登録し、欠席用入力を表示しない", async () => {
        currentQuery = "eventId=EVENT-002&mode=ATTENDANCE";
        render(
            <AbsenceFormContent
                studentId="b234567"
                memberName="参加 花子"
            />
        );

        expect(screen.getByRole("heading", { name: "参加登録" })).toBeInTheDocument();
        expect(screen.queryByRole("combobox")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "参加登録" }));

        await waitFor(() =>
            expect(mocks.submitAbsence).toHaveBeenCalledWith({
                eventId: "EVENT-002",
                studentNumber: "b234567",
                name: "参加 花子",
                type: "出席",
                reason: "出席",
                reasonDetail: undefined,
                timeStepOut: undefined,
                timeReturn: undefined,
                timeLeavingEarly: undefined,
            })
        );
        expect(await screen.findByText("参加登録しました")).toBeInTheDocument();
    });

    it("送信例外時はエラーと入力内容を保持する", async () => {
        mocks.submitAbsence.mockRejectedValueOnce(new Error("通信に失敗しました"));
        render(
            <AbsenceFormContent
                studentId="a123456"
                memberName="放研 太郎"
            />
        );
        const selects = screen.getAllByRole("combobox");
        fireEvent.change(selects[0], { target: { value: "欠席" } });
        fireEvent.change(selects[1], { target: { value: "体調不良" } });

        fireEvent.click(screen.getByRole("button", { name: "欠席連絡を送信" }));

        expect(await screen.findByText("通信に失敗しました")).toBeInTheDocument();
        expect(screen.getAllByRole("combobox")[0]).toHaveValue("欠席");
        expect(screen.getAllByRole("combobox")[1]).toHaveValue("体調不良");
    });
});
