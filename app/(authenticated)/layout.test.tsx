import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
}));

vi.mock("@/src/auth", () => ({ auth: mocks.auth }));
vi.mock("@/src/features/access-log/AccessLogger", () => ({
    AccessLogger: () => <div data-testid="access-logger" />,
}));
vi.mock("@/src/features/pwa-install", () => ({
    PWANotificationPrompt: () => <div data-testid="pwa-prompt" />,
}));
vi.mock("@/src/widgets/header", () => ({
    Header: () => <header data-testid="header" />,
}));
vi.mock("@/src/widgets/dock", () => ({
    Dock: () => <nav data-testid="dock" />,
}));
vi.mock("@/src/widgets/sidebar", () => ({
    Sidebar: ({ children, session }: { children?: React.ReactNode; session?: unknown }) => (
        <aside data-testid="sidebar" data-has-session={String(Boolean(session))}>
            {children}
        </aside>
    ),
}));

import AuthenticatedLayout from "./layout";

describe("AuthenticatedLayout", () => {
    beforeEach(() => {
        mocks.auth.mockReset();
        mocks.auth.mockResolvedValue({
            user: { name: "テスト部員", email: "test@example.com" },
        });
    });

    it("ページ本体を1回だけ描画し、取得済みセッションをSidebarへ渡す", async () => {
        const layout = await AuthenticatedLayout({
            children: <div data-testid="page-content">ページ本体</div>,
        });

        render(layout);

        expect(screen.getAllByTestId("page-content")).toHaveLength(1);
        expect(screen.getByTestId("sidebar")).toHaveAttribute(
            "data-has-session",
            "true"
        );
        expect(screen.getByTestId("sidebar")).not.toContainElement(
            screen.getByTestId("page-content")
        );
        expect(mocks.auth).toHaveBeenCalledTimes(1);
    });
});
