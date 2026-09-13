import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const modalState = vi.hoisted(() => ({ modal: null as string | null, event: "", date: "2026-09-15", close: vi.fn() }));
vi.mock("@/src/shared/ui/AppModal", () => ({
    AppModal: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
}));
vi.mock("@/features/schedule-card", () => ({
    ScheduleCard: ({ endTime }: { endTime?: string }) => <output data-testid="detail-end-time">{endTime}</output>,
}));
vi.mock("@/src/shared/lib/use-url-modal", () => ({
    useUrlModal: () => ({
        modal: modalState.modal,
        getModalParam: (key: string) => key === "event" ? modalState.event : modalState.date,
        openModal: vi.fn(),
        replaceModal: vi.fn(),
        closeModal: modalState.close,
    }),
}));

import CalendarClient from "./CalendarClient";

const jsonResponse = (data: unknown) =>
    new Response(JSON.stringify(data), {
        status: 200,
        headers: { "content-type": "application/json" },
    });

describe("CalendarClient", () => {
    beforeEach(() => {
        localStorage.clear();
        modalState.modal = null;
        modalState.event = "";
        modalState.close.mockReset();
        vi.stubGlobal("fetch", vi.fn());
    });

    it.each([["20", "30"], ["0", "0"]])("新規作成直後の終了%s:%sを表示し、タイトル変更で消さない", async (hour, minute) => {
        modalState.modal = "schedule-create";
        const data = { eventId: "new-event", year: "2026", month: "9", date: "15", timeHH: "18", timeMM: "0", endTimeHH: hour, endTimeMM: minute, title: "テスト予定", where: "", detail: "" };
        vi.mocked(fetch).mockImplementation(async (_url, init) => {
            const body = JSON.parse(String(init?.body));
            return jsonResponse({ success: true, data: { ...data, ...body,
                endTimeHH: body.endTimeHH === undefined ? "" : Number(body.endTimeHH),
                endTimeMM: body.endTimeMM === undefined ? "" : Number(body.endTimeMM),
            } });
        });
        const initialData = { schedules: [], absences: [] };
        const view = render(<CalendarClient initialData={initialData} />);
        const title = await screen.findByPlaceholderText("予定のタイトル");
        fireEvent.change(title, { target: { value: data.title } });
        const hours = screen.getAllByPlaceholderText("時");
        const minutes = screen.getAllByPlaceholderText("分");
        fireEvent.change(hours[0], { target: { value: "18" } });
        fireEvent.change(minutes[0], { target: { value: "0" } });
        fireEvent.change(hours[1], { target: { value: hour } });
        fireEvent.change(minutes[1], { target: { value: minute } });
        fireEvent.submit(title.closest("form")!);
        await waitFor(() => expect(modalState.close).toHaveBeenCalled());

        modalState.event = data.eventId;
        modalState.modal = "schedule-detail";
        view.rerender(<CalendarClient initialData={initialData} />);
        expect(await screen.findByTestId("detail-end-time")).toHaveTextContent(`${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`);

        modalState.modal = "schedule-edit";
        view.rerender(<CalendarClient initialData={initialData} />);
        const editedTitle = await screen.findByPlaceholderText("予定のタイトル");
        expect(screen.getAllByPlaceholderText("時")[1]).toHaveValue(Number(hour));
        expect(screen.getAllByPlaceholderText("分")[1]).toHaveValue(Number(minute));
        fireEvent.change(editedTitle, { target: { value: "タイトル変更" } });
        fireEvent.submit(editedTitle.closest("form")!);
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        const init = vi.mocked(fetch).mock.calls[1][1];
        expect(init?.method).toBe("PUT");
        expect(JSON.parse(String(init?.body))).toMatchObject({ title: "タイトル変更", endTimeHH: hour, endTimeMM: minute });
        await waitFor(() => expect(modalState.close).toHaveBeenCalledTimes(2));

        view.unmount();
        render(<CalendarClient initialData={null} />);
        const restoredTitle = await screen.findByPlaceholderText("予定のタイトル");
        expect(restoredTitle).toHaveValue("タイトル変更");
        expect(screen.getAllByPlaceholderText("時")[1]).toHaveValue(Number(hour));
        expect(screen.getAllByPlaceholderText("分")[1]).toHaveValue(Number(minute));
        expect(fetch).toHaveBeenCalledTimes(2);

        fireEvent.change(screen.getAllByPlaceholderText("時")[1], { target: { value: "" } });
        fireEvent.change(screen.getAllByPlaceholderText("分")[1], { target: { value: "" } });
        fireEvent.submit(restoredTitle.closest("form")!);
        await waitFor(() => expect(modalState.close).toHaveBeenCalledTimes(3));
        expect(JSON.parse(String(vi.mocked(fetch).mock.calls[2][1]?.body))).not.toHaveProperty("endTimeHH");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("サーバー初期データがあればマウント直後に再取得しない", async () => {
        render(<CalendarClient initialData={{ schedules: [], absences: [] }} />);

        await act(async () => undefined);

        expect(fetch).not.toHaveBeenCalled();
    });

    it("サーバー初期データがなければクライアントAPIから取得する", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({ success: true, data: [] })
            )
            .mockResolvedValueOnce(
                jsonResponse({ success: true, data: [] })
            );

        render(<CalendarClient initialData={null} />);

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        expect(fetch).toHaveBeenCalledWith(
            "/api/backend?path=schedules",
            { cache: "no-store" }
        );
        expect(fetch).toHaveBeenCalledWith(
            "/api/backend?path=absences",
            { cache: "no-store" }
        );
    });
});
