import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/features/profile-image", () => ({
    ProfileAvatar: () => <div data-testid="profile-avatar" />,
}));
vi.mock("next/link", () => ({
    default: ({
        children,
        ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a {...props}>{children}</a>
    ),
}));

import MoreClient from "./MoreClient";

describe("MoreClient", () => {
    it("Dockから外した機能へのリンクを表示する", () => {
        render(<MoreClient user={undefined} />);

        expect(
            screen.getByRole("link", { name: /機材一覧/ }),
        ).toHaveAttribute("href", "/items");
        expect(screen.getByRole("link", { name: /タスク/ })).toHaveAttribute(
            "href",
            "/tasks",
        );
        expect(
            screen.getByRole("link", { name: /お知らせ/ }),
        ).toHaveAttribute("href", "/notifications");
        expect(screen.getByRole("link", { name: /資料/ })).toHaveAttribute(
            "href",
            "/documents",
        );
    });
});
