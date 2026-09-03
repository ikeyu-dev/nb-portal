import { Children, isValidElement } from "react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    zenMaruGothic: vi.fn(() => ({ className: "zen-maru-gothic" })),
    fontAwesomeConfig: { autoAddCss: true },
}));

vi.mock("next/font/google", () => ({
    Zen_Maru_Gothic: mocks.zenMaruGothic,
}));
vi.mock("@/src/components/ServiceWorkerRegistration", () => ({
    ServiceWorkerRegistration: () => null,
}));
vi.mock("@fortawesome/fontawesome-svg-core", () => ({
    config: mocks.fontAwesomeConfig,
}));

import RootLayout from "./layout";

describe("RootLayout", () => {
    it("Font AwesomeのCSSを初期描画後に注入しない", () => {
        expect(mocks.fontAwesomeConfig.autoAddCss).toBe(false);
    });

    it("next/fontで読み込んだフォントをbodyへ適用する", () => {
        const layout = RootLayout({ children: <main /> });
        const body = Children.toArray(layout.props.children).find(
            (child) => isValidElement(child) && child.type === "body"
        );

        expect(body).toBeDefined();
        expect(isValidElement(body) && body.props.className).toContain(
            "zen-maru-gothic"
        );
        expect(mocks.zenMaruGothic).toHaveBeenCalledWith(
            expect.objectContaining({ weight: ["400"] })
        );
    });

    it("グローバルCSSから外部Google Fontsを読み込まない", () => {
        const css = readFileSync("src/shared/styles/globals.css", "utf8");

        expect(css).not.toContain("fonts.googleapis.com");
        expect(css).not.toContain("M PLUS Rounded 1c");
    });
});
