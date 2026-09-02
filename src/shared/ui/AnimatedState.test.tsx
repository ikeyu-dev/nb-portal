import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedState } from "./AnimatedState";

describe("AnimatedState", () => {
    it("表示領域を維持したまま現在の状態だけを表示する", () => {
        const { rerender } = render(
            <AnimatedState
                activeKey="idle"
                items={[
                    {
                        key: "idle",
                        content: "コピー",
                        inactiveClassName: "rotate-45",
                    },
                    { key: "success", content: "コピーしました" },
                ]}
            />
        );

        expect(screen.getByText("コピー")).toHaveAttribute(
            "data-active",
            "true"
        );
        expect(screen.getByText("コピーしました")).toHaveAttribute(
            "aria-hidden",
            "true"
        );

        rerender(
            <AnimatedState
                activeKey="success"
                items={[
                    {
                        key: "idle",
                        content: "コピー",
                        inactiveClassName: "rotate-45",
                    },
                    { key: "success", content: "コピーしました" },
                ]}
            />
        );

        expect(screen.getByText("コピーしました")).toHaveClass(
            "opacity-100",
            "scale-100"
        );
        expect(screen.getByText("コピー")).toHaveClass(
            "opacity-0",
            "scale-90",
            "rotate-45"
        );
    });
});
