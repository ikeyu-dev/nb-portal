import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationState = vi.hoisted(() => ({ pathname: "/home" }));
vi.mock("next/navigation", () => ({
    usePathname: () => navigationState.pathname,
}));
vi.mock("next/link", () => ({
    default: ({
        prefetch,
        children,
        onClick,
        ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        prefetch?: boolean;
    }) => (
        <a
            {...props}
            data-prefetch={
                prefetch === undefined ? "default" : String(prefetch)
            }
            onClick={(event) => {
                onClick?.(event);
                event.preventDefault();
            }}
        >
            {children}
        </a>
    ),
}));

import Dock from "./Dock";

describe("Dock", () => {
    beforeEach(() => {
        navigationState.pathname = "/home";
    });

    it("モバイルで優先する6項目を日本語で表示する", () => {
        render(<Dock />);

        expect(screen.getAllByRole("link")).toHaveLength(6);
        expect(
            screen.getAllByRole("link").map((link) => link.textContent)
        ).toEqual([
            "ホーム",
            "予定",
            "名簿",
            "アンケート",
            "部会メモ",
            "その他",
        ]);
        expect(screen.queryByRole("link", { name: "タスク" })).toBeNull();
        expect(screen.queryByRole("link", { name: "機材一覧" })).toBeNull();
    });

    it("幹部役員は議事録をDockの独立した7番目の項目から開ける", () => {
        render(<Dock permission="HEAD" />);

        expect(screen.getAllByRole("link")).toHaveLength(7);
        expect(screen.getByRole("link", { name: "議事録" })).toHaveAttribute(
            "href",
            "/executive-meetings"
        );
        expect(screen.queryByRole("link", { name: "その他" })).not.toBeNull();
    });

    it("現在地と遷移開始後の移動先を区別して示す", () => {
        render(<Dock />);

        const navigation = screen.getByRole("navigation", {
            name: "メインナビゲーション",
        });
        const home = screen.getByRole("link", { name: "ホーム" });
        const calendar = screen.getByRole("link", { name: "予定" });

        expect(home).toHaveAttribute("aria-current", "page");
        expect(navigation).toHaveAttribute("data-active-index", "0");
        expect(navigation.querySelector(".app-dock-indicator")).toBeNull();
        expect(navigation.querySelectorAll(".app-dock-icon")).toHaveLength(6);

        fireEvent.click(calendar);

        expect(calendar).toHaveAttribute("aria-busy", "true");
        expect(calendar).toHaveAttribute("data-active", "true");
        expect(navigation).toHaveAttribute("data-active-index", "1");
    });

    it("アンケートの詳細・回答状況でもアンケートを現在地にする", () => {
        navigationState.pathname = "/surveys/survey-1/responses";
        render(<Dock />);

        const surveys = screen.getByRole("link", { name: "アンケート" });
        expect(surveys).toHaveAttribute("aria-current", "page");
        expect(surveys).toHaveAttribute("data-active", "true");
        expect(surveys.querySelector("svg")).toHaveClass(
            "fa-square-poll-vertical"
        );
    });

    it("モバイルの遷移先にNext.js標準のprefetch設定を使う", () => {
        render(<Dock />);

        for (const link of screen.getAllByRole("link")) {
            expect(link).toHaveAttribute("data-prefetch", "default");
        }
    });
});
