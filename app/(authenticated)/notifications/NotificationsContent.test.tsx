import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NotificationsContent } from "./NotificationsContent";

vi.mock("@/src/features/push-notification", () => ({ PushNotificationToggle: () => null }));
vi.mock("@/src/features/help", () => ({ HelpButton: () => null }));
afterEach(() => vi.unstubAllGlobals());

it("通知の初期データを再取得せず表示する", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<NotificationsContent userEmail={null} initialData={[{
        eventId: "E-1", title: "テスト予定", date: "2026/09/06",
        actionBy: "member", actionByName: "部員", actionAt: "2026/09/06 10:00", actionType: "created",
    }]} />);
    expect(screen.getByText("テスト予定")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
});
