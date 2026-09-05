import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/shared/lib/use-url-modal", () => ({
    useUrlModal: () => ({
        modal: null,
        getModalParam: () => null,
        openModal: vi.fn(),
        replaceModal: vi.fn(),
        closeModal: vi.fn(),
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
        vi.stubGlobal("fetch", vi.fn());
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
