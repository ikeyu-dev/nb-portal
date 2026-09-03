import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    usePathname: () => "/home",
}));
vi.mock("next/link", () => ({
    default: ({
        prefetch,
        children,
        ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        prefetch?: boolean;
    }) => (
        <a {...props} data-prefetch={String(prefetch)}>
            {children}
        </a>
    ),
}));

import Dock from "./Dock";

describe("Dock", () => {
    it("Sidebarと重複するルートを自動prefetchしない", () => {
        render(<Dock />);

        for (const link of screen.getAllByRole("link")) {
            expect(link).toHaveAttribute("data-prefetch", "false");
        }
    });
});
