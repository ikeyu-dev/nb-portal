import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getMembers: vi.fn(),
    getEventAttendance: vi.fn(),
    updateEventAttendance: vi.fn(),
}));

vi.mock("@/src/shared/api/client", () => ({
    getMembers: mocks.getMembers,
    getEventAttendance: mocks.getEventAttendance,
    updateEventAttendance: mocks.updateEventAttendance,
}));
vi.mock("@/src/shared/lib/use-url-modal", async () => {
    const React = await import("react");
    return {
        useUrlModal: () => {
            const [modal, setModal] = React.useState<string | null>(
                "schedule-response"
            );
            return {
                modal,
                getModalParam: (key: string) =>
                    key === "event" ? "EVENT-001" : null,
                openModal: (name: string) => setModal(name),
                replaceModal: (name: string) => setModal(name),
                closeModal: () => setModal(null),
            };
        },
    };
});

import ScheduleCard from "./ScheduleCard";

const baseProps = {
    eventId: "EVENT-001",
    title: "夏季活動",
    where: "部室",
    absences: [],
    currentStudentNumber: "a123456",
    currentDisplayName: "放研 太郎",
    startDate: "2099-09-01",
    attendanceDeadline: "2099-09-01",
    dateLabel: "2099/09/01",
    timeLabel: "18:00",
    hideCard: true,
};

const response = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("ScheduleCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("fetch", vi.fn());
        mocks.getMembers.mockResolvedValue({
            success: true,
            data: { headers: [], members: [] },
        });
        mocks.getEventAttendance.mockResolvedValue({ success: true, data: [] });
        mocks.updateEventAttendance.mockResolvedValue({ success: true });
    });

    it("希望者参加の参加登録を出席連絡として送信する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            response({
                success: true,
                data: {
                    timestamp: "2099-09-01T17:00:00+09:00",
                    studentNumber: "a123456",
                    name: "放研 太郎",
                },
            })
        );
        render(<ScheduleCard {...baseProps} attendanceMode="ATTENDANCE" />);

        expect(screen.getByText("参加者はいません")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "参加登録" }));
        fireEvent.change(screen.getByPlaceholderText("補足があれば入力してください"), {
            target: { value: "途中から参加" },
        });
        fireEvent.click(screen.getByRole("button", { name: "送信" }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith("/api/absence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId: "EVENT-001",
                    eventTitle: "夏季活動",
                    eventDateLabel: "2099/09/01",
                    eventTimeLabel: "18:00",
                    eventWhere: "部室",
                    type: "出席",
                    reasonDetail: "途中から参加",
                }),
            })
        );
        expect(await screen.findByText("参加登録しました")).toBeInTheDocument();
        expect(screen.getByText("放研 太郎")).toBeInTheDocument();
        expect(screen.getByText("出席")).toBeInTheDocument();
    });

    it("通常予定の欠席連絡を入力内容付きで送信する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            response({ success: true, data: { type: "遅刻", reason: "授業" } })
        );
        render(<ScheduleCard {...baseProps} attendanceMode="ABSENCE" />);

        fireEvent.click(screen.getByRole("button", { name: "欠席連絡" }));
        const dialog = screen.getByRole("dialog", { name: "夏季活動" });
        const selects = dialog.querySelectorAll("select");
        fireEvent.change(selects[0], { target: { value: "遅刻" } });
        fireEvent.change(selects[1], { target: { value: "授業" } });
        fireEvent.change(screen.getByPlaceholderText("補足があれば入力してください"), {
            target: { value: "授業後に向かいます" },
        });
        fireEvent.click(screen.getByRole("button", { name: "送信" }));

        await waitFor(() => {
            const options = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
            expect(JSON.parse(String(options.body))).toEqual({
                eventId: "EVENT-001",
                eventTitle: "夏季活動",
                eventDateLabel: "2099/09/01",
                eventTimeLabel: "18:00",
                eventWhere: "部室",
                studentNumber: "a123456",
                name: "放研 太郎",
                type: "遅刻",
                reason: "授業",
                reasonDetail: "授業後に向かいます",
            });
        });
        expect(await screen.findByText("欠席連絡を送信しました")).toBeInTheDocument();
    });

    it("当日の出席者からOB・OGを除外し、選択した学籍番号を保存する", async () => {
        mocks.getMembers.mockResolvedValueOnce({
            success: true,
            data: {
                headers: [],
                members: [
                    {
                        rowNumber: 2,
                        values: ["a123456", "放研 太郎", "たろう", "", "", "", "", "NORMAL"],
                    },
                    {
                        rowNumber: 3,
                        values: ["b234567", "放研 花子", "はな", "", "", "", "", "OBOG"],
                    },
                ],
            },
        });
        render(<ScheduleCard {...baseProps} />);

        fireEvent.click(screen.getByRole("button", { name: "閲覧・編集" }));
        expect(await screen.findByText("たろう")).toBeInTheDocument();
        expect(screen.queryByText("はな")).toBeNull();
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByRole("button", { name: "保存" }));

        await waitFor(() =>
            expect(mocks.updateEventAttendance).toHaveBeenCalledWith({
                eventId: "EVENT-001",
                studentNumbers: ["a123456"],
            })
        );
        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText("名前・学籍番号で検索")
            ).toBeNull()
        );
        expect(screen.getByRole("button", { name: "閲覧・編集" })).toBeInTheDocument();
        expect(screen.getByText("たろう")).toBeInTheDocument();
    });

    it("出欠連絡期限を過ぎた予定では新規連絡を無効化する", () => {
        render(
            <ScheduleCard
                {...baseProps}
                startDate="2020-01-02"
                attendanceDeadline="2020-01-01"
            />
        );

        expect(
            screen.getByText("出欠連絡期限は2020/01/01 08:00です。")
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "受付時間外" })).toBeDisabled();
    });
});
