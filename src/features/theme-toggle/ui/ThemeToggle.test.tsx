import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
            callback(0);
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", vi.fn());
        vi.stubGlobal("matchMedia", () => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("テーマに合わせてアイコンをクロスフェードする", async () => {
        render(<ThemeToggle />);

        const toggle = screen.getByRole("switch", {
            name: "テーマを切り替え",
        });
        await waitFor(() => expect(toggle).toBeEnabled());
        expect(toggle).toHaveAttribute("aria-checked", "false");
        const thumb = toggle.querySelector('[data-theme-thumb="true"]');
        const lightIcon = toggle.querySelector('[data-state-key="light"]');
        const darkIcon = toggle.querySelector('[data-state-key="dark"]');

        expect(thumb).toHaveClass(
            "motion-safe:transition-[translate]",
            "motion-safe:duration-300"
        );
        expect(lightIcon).toHaveAttribute("data-active", "true");
        expect(darkIcon).toHaveClass("-rotate-45");

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute("aria-checked", "true");
        expect(darkIcon).toHaveAttribute("data-active", "true");
        expect(lightIcon).toHaveClass("rotate-45");
    });
});
