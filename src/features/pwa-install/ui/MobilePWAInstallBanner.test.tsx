import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobilePWAInstallBanner } from "./MobilePWAInstallBanner";

describe("MobilePWAInstallBanner", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        vi.stubGlobal(
            "matchMedia",
            vi.fn((query: string) => ({
                matches: query === "(max-width: 768px)",
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }))
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("表示時に文書レイアウトを押し下げない", () => {
        render(<MobilePWAInstallBanner />);

        act(() => vi.runAllTimers());

        const banner = screen
            .getByText("ホーム画面に追加できます")
            .closest("aside");
        expect(banner).toHaveClass("fixed");
        expect(banner).not.toHaveClass("mb-5");
    });
});
