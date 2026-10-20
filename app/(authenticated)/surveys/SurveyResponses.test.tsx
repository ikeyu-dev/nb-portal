import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Survey } from "./types";

const mocks = vi.hoisted(() => ({ getSurvey: vi.fn() }));
vi.mock("./api", () => mocks);
vi.mock("next/link", () => ({
    default: ({
        href,
        children,
    }: {
        href: string;
        children: React.ReactNode;
    }) => <a href={href}>{children}</a>,
}));

import { SurveyResponses } from "./SurveyResponses";

const survey: Survey = {
    id: "survey1",
    title: "参加可能日",
    description: "",
    creatorId: "member1",
    deadlineAt: "2099-01-01T00:00:00.000Z",
    resultsPublic: false,
    status: "published",
    open: true,
    canEdit: true,
    lockedQuestions: [],
    lockedOptions: [],
    sections: [{ id: "section-1", title: "日程", description: "" }],
    questions: [
        {
            id: "q1",
            sectionId: "section-1",
            label: "参加できる日",
            type: "multiple",
            required: false,
            options: [
                { id: "mon", label: "月曜日" },
                { id: "tue", label: "火曜日" },
            ],
        },
    ],
    mine: null,
    responses: [
        {
            studentId: "s100",
            nickname: "あお",
            name: "青木",
            answers: { q1: ["mon"] },
            submittedAt: "2098-01-01T00:00:00.000Z",
        },
        {
            studentId: "s200",
            nickname: "みどり",
            name: "緑川",
            answers: { q1: ["mon", "tue"] },
            submittedAt: "2098-01-02T00:00:00.000Z",
        },
    ],
};

describe("アンケート回答状況", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSurvey.mockResolvedValue(survey);
    });

    it("回答一覧に学籍番号とあだ名を列として表示する", async () => {
        render(<SurveyResponses id="survey1" />);

        expect(
            await screen.findByRole("columnheader", { name: "学籍番号" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("columnheader", { name: "あだ名" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("columnheader", { name: "氏名" })
        ).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "s100" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "あお" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "青木" })).toBeInTheDocument();
    });

    it("質問と回答を選ぶと該当する回答者だけ表示する", async () => {
        render(<SurveyResponses id="survey1" />);
        fireEvent.click(await screen.findByRole("tab", { name: "回答別" }));
        fireEvent.change(screen.getByRole("combobox", { name: "質問" }), {
            target: { value: "q1" },
        });
        fireEvent.change(screen.getByRole("combobox", { name: "回答" }), {
            target: { value: "mon" },
        });

        await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(3));
        expect(screen.getByRole("cell", { name: "s100" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "s200" })).toBeInTheDocument();
    });
});
