import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModal } from "./AppModal";

describe("AppModal", () => {
    let nextFrame: FrameRequestCallback | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        nextFrame = undefined;
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
            nextFrame = callback;
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", () => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("開いた次のフレームで表示状態へ遷移する", () => {
        render(
            <AppModal open onClose={vi.fn()} ariaLabel="テストモーダル">
                本文
            </AppModal>
        );

        const dialog = screen.getByRole("dialog", {
            name: "テストモーダル",
        });
        expect(dialog.querySelector(".modal-box")).toHaveClass(
            "app-modal-panel"
        );
        expect(dialog).not.toHaveClass("modal-open");
        expect(dialog).toHaveAttribute("data-state", "opening");

        act(() => {
            nextFrame?.(0);
        });

        expect(dialog).toHaveClass("modal-open");
        expect(dialog).toHaveAttribute("data-state", "open");
    });

    it("閉じる指示後は終了アニメーションの間だけDOMを保持する", () => {
        const { rerender } = render(
            <AppModal open onClose={vi.fn()} ariaLabel="テストモーダル">
                本文
            </AppModal>
        );
        act(() => {
            nextFrame?.(0);
        });

        rerender(
            <AppModal open={false} onClose={vi.fn()} ariaLabel="テストモーダル">
                本文
            </AppModal>
        );

        expect(
            screen.getByRole("dialog", { name: "テストモーダル" })
        ).not.toHaveClass("modal-open");
        expect(
            screen.getByRole("dialog", { name: "テストモーダル" })
        ).toHaveAttribute("data-state", "closed");

        act(() => {
            vi.advanceTimersByTime(240);
        });

        expect(
            screen.getByRole("dialog", { name: "テストモーダル" })
        ).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(40);
        });

        expect(
            screen.queryByRole("dialog", { name: "テストモーダル" })
        ).toBeNull();
    });

    it("背景クリックとEscapeキーで閉じる", () => {
        const onClose = vi.fn();
        render(
            <AppModal open onClose={onClose} ariaLabel="テストモーダル">
                本文
            </AppModal>
        );

        fireEvent.click(
            screen.getByRole("button", { name: "モーダルを閉じる" })
        );
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
