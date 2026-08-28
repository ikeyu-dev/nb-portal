import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AsyncButton } from "./AsyncButton";

describe("AsyncButton", () => {
    it("通常時は操作名を表示して有効になる", () => {
        render(<AsyncButton>保存</AsyncButton>);

        const button = screen.getByRole("button", { name: "保存" });
        expect(button).toBeEnabled();
        expect(button).not.toHaveAttribute("aria-busy");
    });

    it("処理中は無効化し、状態と処理中ラベルを通知する", () => {
        render(
            <AsyncButton loading loadingLabel="保存中">
                保存
            </AsyncButton>
        );

        const button = screen.getByRole("button", { name: "保存中" });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("aria-busy", "true");
        expect(button.querySelector(".loading-spinner")).toBeInTheDocument();
    });

    it("通常表示と処理中表示を同じグリッド領域に置く", () => {
        const { container } = render(
            <AsyncButton loading loadingLabel="送信中">
                送信
            </AsyncButton>
        );

        const labels = container.querySelectorAll("[data-button-state]");
        expect(labels).toHaveLength(2);
        expect(labels[0]).toHaveClass("col-start-1", "row-start-1");
        expect(labels[1]).toHaveClass("col-start-1", "row-start-1");
    });
});
