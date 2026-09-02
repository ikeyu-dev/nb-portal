import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedAlert } from "./AnimatedAlert";

describe("AnimatedAlert", () => {
    let nextFrame: FrameRequestCallback | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        nextFrame = undefined;
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
            nextFrame = callback;
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", vi.fn());
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("表示と退場の間だけ内容をDOMに保持する", () => {
        const { rerender } = render(
            <AnimatedAlert show variant="success">
                保存しました
            </AnimatedAlert>
        );

        const alert = screen.getByRole("alert");
        expect(alert).toHaveAttribute("data-state", "opening");
        act(() => nextFrame?.(0));
        expect(alert).toHaveAttribute("data-state", "open");

        rerender(
            <AnimatedAlert show={false} variant="success">
                保存しました
            </AnimatedAlert>
        );
        expect(alert).toHaveAttribute("data-state", "closed");
        expect(screen.getByText("保存しました")).toBeInTheDocument();

        act(() => vi.advanceTimersByTime(159));
        expect(screen.getByRole("alert")).toBeInTheDocument();
        act(() => vi.advanceTimersByTime(1));
        expect(screen.queryByRole("alert")).toBeNull();
    });
});
