import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    usePathname: () => "/home",
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
            data-prefetch={String(prefetch)}
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
    it("モバイルで優先する5項目を日本語で表示する", () => {
        render(<Dock />);

        expect(screen.getAllByRole("link")).toHaveLength(5);
        expect(
            screen.getAllByRole("link").map((link) => link.textContent),
        ).toEqual(["ホーム", "予定", "名簿", "部会メモ", "その他"]);
        expect(screen.queryByRole("link", { name: "タスク" })).toBeNull();
        expect(screen.queryByRole("link", { name: "機材一覧" })).toBeNull();
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
        expect(navigation.querySelectorAll(".app-dock-icon")).toHaveLength(5);

        fireEvent.click(calendar);

        expect(calendar).toHaveAttribute("aria-busy", "true");
        expect(calendar).toHaveAttribute("data-active", "true");
        expect(navigation).toHaveAttribute("data-active-index", "1");
    });

    it("Sidebarと重複するルートを自動prefetchしない", () => {
        render(<Dock />);

        for (const link of screen.getAllByRole("link")) {
            expect(link).toHaveAttribute("data-prefetch", "false");
        }
    });
});
