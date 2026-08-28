import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    usePathname: () => "/calendar",
}));

import { AccessLogger } from "./AccessLogger";

const STORAGE_KEY = "nb-portal-access-log-last:/calendar";

describe("AccessLogger", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        vi.spyOn(Date, "now").mockReturnValue(1_787_883_296_000);
        vi.stubGlobal("fetch", vi.fn());
    });

    it.each([400, 500])(
        "APIがHTTP %sを返した場合は送信済み状態を解除して再送できる",
        async (status) => {
            vi.mocked(fetch)
                .mockResolvedValueOnce(new Response(null, { status }))
                .mockResolvedValueOnce(new Response(null, { status: 200 }));

            const firstRender = render(<AccessLogger />);
            await waitFor(() =>
                expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
            );
            firstRender.unmount();

            render(<AccessLogger />);
            await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
            expect(localStorage.getItem(STORAGE_KEY)).toBe(
                "1787883296000"
            );
        }
    );

    it("成功時は送信時刻を保持し、5分以内の再送を抑止する", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(null, { status: 200 })
        );

        const firstRender = render(<AccessLogger />);
        await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
        firstRender.unmount();
        render(<AccessLogger />);

        await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
        expect(localStorage.getItem(STORAGE_KEY)).toBe("1787883296000");
    });
});
