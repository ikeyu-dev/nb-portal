import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/src/auth", () => ({ auth: async () => ({ studentId: "member1" }) }));
vi.mock("@/src/shared/api/server", () => ({ getSchedulesServer: async () => ({ success: true, data: [{ EVENT_ID: "assigned", ATTENDANCE_MODE: "ASSIGNED" }] }) }));
vi.mock("./AbsenceFormContent", () => ({ AbsenceFormContent: ({ resolvedAttendanceMode }: { resolvedAttendanceMode?: string }) => <output>{resolvedAttendanceMode}</output> }));
import AbsencePage from "./page";
it("直接アクセスでもURLの方式を信用せずDB上の参加者指定を引き渡す", async () => {
    render(await AbsencePage({ searchParams: Promise.resolve({ eventId: "assigned", mode: "ABSENCE" }) }));
    expect(screen.getByText("ASSIGNED")).toBeInTheDocument();
});
