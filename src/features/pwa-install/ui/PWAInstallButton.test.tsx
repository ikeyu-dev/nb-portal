import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PWAInstallButton } from "./PWAInstallButton";

const matchMedia = vi.fn();

describe("PWAInstallButton", () => {
    beforeEach(() => {
        matchMedia.mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
        vi.stubGlobal("matchMedia", matchMedia);
    });

    it("インストール要求を受け取った場合だけボタンを表示してpromptを実行する", async () => {
        const prompt = vi.fn().mockResolvedValue(undefined);
        const event = new Event("beforeinstallprompt") as Event & {
            prompt: () => Promise<void>;
            userChoice: Promise<{ outcome: "accepted" }>;
        };
        event.prompt = prompt;
        event.userChoice = Promise.resolve({ outcome: "accepted" });

        render(<PWAInstallButton />);
        expect(
            screen.queryByRole("button", { name: "アプリをインストール" })
        ).not.toBeInTheDocument();

        act(() => window.dispatchEvent(event));
        fireEvent.click(
            screen.getByRole("button", { name: "アプリをインストール" })
        );

        await vi.waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    });
});
