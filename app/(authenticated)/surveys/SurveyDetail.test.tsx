import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Survey } from "./types";

const mocks = vi.hoisted(() => ({ getSurvey: vi.fn(), updateSurvey: vi.fn() }));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("./api", () => mocks);
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/link", () => ({
    default: ({
        href,
        children,
        onClick,
        role,
        "aria-selected": ariaSelected,
        className,
    }: {
        href: string;
        children: React.ReactNode;
        onClick?: React.MouseEventHandler<HTMLAnchorElement>;
        role?: string;
        "aria-selected"?: boolean;
        className?: string;
    }) => (
        <a
            href={href}
            onClick={onClick}
            role={role}
            aria-selected={ariaSelected}
            className={className}
        >
            {children}
        </a>
    ),
}));

import { SurveyDetail } from "./SurveyDetail";

const survey: Survey = {
    id: "survey1",
    title: "アンケート",
    description: "",
    creatorId: "member1",
    deadlineAt: "2099-01-01T00:00:00.000Z",
    resultsPublic: false,
    status: "published",
    open: true,
    canEdit: false,
    lockedQuestions: [],
    lockedOptions: [],
    questions: [
        {
            id: "q1",
            sectionId: "section-1",
            label: "ご意見",
            type: "short",
            required: true,
            options: [],
        },
    ],
    sections: [{ id: "section-1", title: "セクション1", description: "" }],
    mine: null,
};

describe("回答の自動保存", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSurvey.mockResolvedValue(survey);
        mocks.updateSurvey.mockResolvedValue(undefined);
    });

    it("入力を下書き保存し、送信後だけ確定する", async () => {
        render(<SurveyDetail id="survey1" />);
        const input = await screen.findByRole("textbox", { name: "ご意見" });
        const status = screen.getByRole("status");
        expect(
            input.compareDocumentPosition(status) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(status).toHaveClass("min-h-10");
        fireEvent.change(input, { target: { value: "意見です" } });
        await waitFor(
            () =>
                expect(mocks.updateSurvey).toHaveBeenCalledWith({
                    action: "draft",
                    id: "survey1",
                    answers: { q1: "意見です" },
                    currentSectionId: "section-1",
                }),
            { timeout: 2000 }
        );
        expect(mocks.updateSurvey).not.toHaveBeenCalledWith(
            expect.objectContaining({ action: "submit" })
        );
        fireEvent.click(screen.getByRole("button", { name: "回答を送信" }));
        await waitFor(() =>
            expect(mocks.updateSurvey).toHaveBeenCalledWith({
                action: "submit",
                id: "survey1",
                answers: { q1: "意見です" },
                currentSectionId: "section-1",
            })
        );
    });

    it("セクション表示と進捗バーを回答操作の直前に表示する", async () => {
        render(<SurveyDetail id="survey1" />);
        const answer = await screen.findByRole("textbox", { name: "ご意見" });
        const progress = screen.getByRole("progressbar");
        const submit = screen.getByRole("button", { name: "回答を送信" });

        expect(
            answer.compareDocumentPosition(progress) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(
            progress.compareDocumentPosition(submit) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(progress.parentElement).toHaveTextContent("セクション 1 / 1");
    });
});

describe("アンケート詳細の表示", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSurvey.mockResolvedValue({
            ...survey,
            status: "closed",
            open: false,
            deadlineAt: "2026-10-20T14:30:45.000Z",
            resultsPublic: true,
            responses: [
                {
                    studentId: "member2",
                    name: "部員二",
                    nickname: "みどり",
                    answers: { q1: "回答内容" },
                    submittedAt: "2026-10-20T14:00:00.000Z",
                },
            ],
        });
    });

    it("締切から秒を省き、終了バッジをヘッダー右上に置く", async () => {
        render(<SurveyDetail id="survey1" />);
        const badge = await screen.findByText("受付終了");
        const header = badge.closest("header");
        const deadline = screen.getByText(/締切/);

        expect(header).toHaveClass("justify-between");
        expect(deadline.textContent).not.toMatch(/:\d{2}:\d{2}/);
    });

    it("個別回答一覧は詳細画面に表示せず、回答状況ページへ案内する", async () => {
        render(<SurveyDetail id="survey1" />);

        const sectionTitle = await screen.findByRole("heading", {
            name: "セクション1",
        });
        expect(
            await screen.findByRole("tab", { name: /回答状況/ })
        ).toHaveAttribute("href", "/surveys/survey1/responses");
        expect(screen.getByRole("tab", { name: "回答画面" })).toHaveAttribute(
            "aria-selected",
            "true"
        );
        expect(screen.getByRole("tab", { name: "回答状況" })).toHaveAttribute(
            "aria-selected",
            "false"
        );
        expect(sectionTitle.parentElement).not.toHaveClass("px-5");
        expect(
            screen.queryByRole("heading", { name: "回答一覧" })
        ).not.toBeInTheDocument();
        expect(screen.queryByText("回答内容")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: /回答結果/ })
        ).not.toBeInTheDocument();
    });

    it("編集と受付終了をタイトルヘッダー右側に配置する", async () => {
        mocks.getSurvey.mockResolvedValue({
            ...survey,
            canEdit: true,
            responses: [],
        });
        render(<SurveyDetail id="survey1" />);

        const title = await screen.findByRole("heading", {
            name: "アンケート",
        });
        const header = title.closest("header");
        const editButton = screen.getByRole("button", { name: "編集" });
        const closeButton = screen.getByRole("button", { name: "受付を終了" });

        expect(header).toContainElement(editButton);
        expect(header).toContainElement(closeButton);
        expect(header).toHaveClass("justify-between");
    });

    it("複数選択肢の間に十分な縦間隔を設ける", async () => {
        mocks.getSurvey.mockResolvedValue({
            ...survey,
            questions: [
                {
                    ...survey.questions[0],
                    type: "multiple",
                    options: [
                        { id: "option-1", label: "候補1" },
                        { id: "option-2", label: "候補2" },
                    ],
                },
            ],
        });
        render(<SurveyDetail id="survey1" />);

        const choices = await screen.findByRole("group", { name: "ご意見" });
        expect(choices).toHaveClass("space-y-3");
    });
});

describe("セクション移動時の入力検証", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSurvey.mockResolvedValue({
            ...survey,
            canEdit: true,
            sections: [
                { id: "section-1", title: "前半", description: "" },
                { id: "section-2", title: "後半", description: "" },
            ],
            questions: [
                survey.questions[0],
                {
                    ...survey.questions[0],
                    id: "q2",
                    sectionId: "section-2",
                    label: "後半の質問",
                },
            ],
        });
        mocks.updateSurvey.mockResolvedValue(undefined);
    });

    it("必須回答が空でも前のセクションへ戻れる", async () => {
        render(<SurveyDetail id="survey1" />);
        fireEvent.change(
            await screen.findByRole("textbox", { name: "ご意見" }),
            {
                target: { value: "回答" },
            }
        );
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));
        await screen.findByRole("textbox", { name: "後半の質問" });

        fireEvent.click(screen.getByRole("button", { name: "前へ" }));

        expect(
            await screen.findByRole("textbox", { name: "ご意見" })
        ).toBeInTheDocument();
    });

    it("次へで必須回答がない場合、該当欄直下に表示してフォーカスする", async () => {
        render(<SurveyDetail id="survey1" />);
        const input = await screen.findByRole("textbox", { name: "ご意見" });
        fireEvent.click(screen.getByRole("button", { name: "次へ" }));

        await waitFor(() => expect(input).toHaveFocus());
        expect(screen.getByText("「ご意見」は必須です。")).toBeInTheDocument();
        expect(input.parentElement).toContainElement(
            screen.getByText("「ご意見」は必須です。")
        );
    });
});

describe("作成中のアンケート", () => {
    const draft: Survey = {
        ...survey,
        status: "draft",
        canEdit: true,
        title: "元のタイトル",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSurvey.mockResolvedValue(draft);
        mocks.updateSurvey.mockResolvedValue(undefined);
    });

    it("タイトル変更後に自動で下書きを保存する", async () => {
        render(<SurveyDetail id="survey1" />);
        const title = await screen.findByRole("textbox", { name: "タイトル" });
        expect(
            screen.queryByRole("button", { name: "下書きを保存" })
        ).not.toBeInTheDocument();
        const status = screen.getByRole("status");
        expect(
            title.compareDocumentPosition(status) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(status).toHaveClass("min-h-10");
        fireEvent.change(title, { target: { value: "新しいタイトル" } });

        await waitFor(
            () =>
                expect(mocks.updateSurvey).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: "save",
                        id: "survey1",
                        title: "新しいタイトル",
                    })
                ),
            { timeout: 2000 }
        );
    });

    it("公開時にタイトルと締切のエラーを各入力欄の直下へ出す", async () => {
        render(<SurveyDetail id="survey1" />);
        const title = await screen.findByRole("textbox", { name: "タイトル" });
        fireEvent.change(title, { target: { value: "" } });
        fireEvent.change(screen.getByLabelText("回答締切"), {
            target: { value: "" },
        });
        fireEvent.click(screen.getByRole("button", { name: "公開する" }));

        expect(
            await screen.findByText("タイトルを入力してください。")
        ).toBeInTheDocument();
        expect(
            screen.getByText("回答締切を設定してください。")
        ).toBeInTheDocument();
        await waitFor(() => expect(title).toHaveFocus());
        expect(title.parentElement).toContainElement(
            screen.getByText("タイトルを入力してください。")
        );
    });

    it("説明文を4,096文字に制限し、超過時は公開を止めて欄にエラーを出す", async () => {
        render(<SurveyDetail id="survey1" />);
        await screen.findByText("説明", { selector: "span" });
        const description = screen
            .getByText("説明", { selector: "span" })
            .closest("label")
            ?.querySelector("textarea");
        expect(description).not.toBeNull();

        expect(description).toHaveAttribute("maxLength", "4096");
        fireEvent.change(description, {
            target: { value: "あ".repeat(4097) },
        });
        fireEvent.click(screen.getByRole("button", { name: "公開する" }));

        expect(
            await screen.findByText("説明は4,096文字以内で入力してください。")
        ).toBeInTheDocument();
        expect(mocks.updateSurvey).not.toHaveBeenCalledWith(
            expect.objectContaining({ action: "publish" })
        );
    });

    it("質問形式と選択肢を編集しても下書きに保存する", async () => {
        render(<SurveyDetail id="survey1" />);
        fireEvent.change(
            await screen.findByRole("combobox", { name: "質問 1 の形式" }),
            { target: { value: "single" } }
        );
        fireEvent.change(screen.getByRole("textbox", { name: "選択肢 1" }), {
            target: { value: "参加する" },
        });

        await waitFor(
            () =>
                expect(mocks.updateSurvey).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: "save",
                        questions: [
                            expect.objectContaining({
                                type: "single",
                                options: [
                                    expect.objectContaining({
                                        label: "参加する",
                                    }),
                                    expect.any(Object),
                                ],
                            }),
                        ],
                    })
                ),
            { timeout: 2000 }
        );
    });

    it("選択肢の日付ピッカーで選んだ日付を選択肢として保存する", async () => {
        render(<SurveyDetail id="survey1" />);
        fireEvent.change(
            await screen.findByRole("combobox", { name: "質問 1 の形式" }),
            { target: { value: "multiple" } }
        );
        fireEvent.change(screen.getByLabelText("選択肢 1 の日付を選択"), {
            target: { value: "2026-10-20" },
        });

        expect(screen.getByRole("textbox", { name: "選択肢 1" })).toHaveValue(
            "2026/10/20"
        );
        await waitFor(
            () =>
                expect(mocks.updateSurvey).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: "save",
                        questions: [
                            expect.objectContaining({
                                options: [
                                    expect.objectContaining({
                                        label: "2026/10/20",
                                    }),
                                    expect.any(Object),
                                ],
                            }),
                        ],
                    })
                ),
            { timeout: 2000 }
        );
    });

    it("質問形式を切り替えても設定済みの選択肢を保持する", async () => {
        render(<SurveyDetail id="survey1" />);
        const type = await screen.findByRole("combobox", {
            name: "質問 1 の形式",
        });
        fireEvent.change(type, { target: { value: "single" } });
        fireEvent.change(screen.getByRole("textbox", { name: "選択肢 1" }), {
            target: { value: "参加する" },
        });
        fireEvent.change(type, { target: { value: "short" } });
        fireEvent.change(type, { target: { value: "multiple" } });

        expect(screen.getByRole("textbox", { name: "選択肢 1" })).toHaveValue(
            "参加する"
        );
    });

    it("各質問から、その直後に新しい質問を追加できる", async () => {
        render(<SurveyDetail id="survey1" />);
        await screen.findByRole("textbox", { name: "質問 1 の質問文" });
        fireEvent.click(
            screen.getByRole("button", { name: "質問 1 の下に追加" })
        );

        expect(
            screen.getByRole("textbox", { name: "質問 2 の質問文" })
        ).toBeInTheDocument();
    });

    it("入力直後に一覧を押しても、保存完了まで遷移しない", async () => {
        let finishSave!: () => void;
        mocks.updateSurvey.mockImplementation(
            () => new Promise<void>((resolve) => (finishSave = resolve))
        );
        render(<SurveyDetail id="survey1" />);
        fireEvent.change(
            await screen.findByRole("textbox", { name: "タイトル" }),
            {
                target: { value: "移動前のタイトル" },
            }
        );
        fireEvent.click(screen.getByRole("link", { name: "アンケート一覧" }));

        await waitFor(() => expect(mocks.updateSurvey).toHaveBeenCalledOnce());
        expect(mocks.updateSurvey).toHaveBeenCalledWith(
            expect.objectContaining({ title: "移動前のタイトル" })
        );
        expect(navigation.push).not.toHaveBeenCalled();
        finishSave();
        await waitFor(() =>
            expect(navigation.push).toHaveBeenCalledWith("/surveys")
        );
    });

    it("一覧へ戻る際の保存に失敗したら、入力を残して移動しない", async () => {
        mocks.updateSurvey.mockRejectedValue(new Error("保存に失敗しました"));
        render(<SurveyDetail id="survey1" />);
        fireEvent.change(
            await screen.findByRole("textbox", { name: "タイトル" }),
            {
                target: { value: "残すタイトル" },
            }
        );
        fireEvent.click(screen.getByRole("link", { name: "アンケート一覧" }));

        await screen.findByText(
            "保存できませんでした。入力はこの画面に残っています"
        );
        expect(navigation.push).not.toHaveBeenCalled();
        expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue(
            "残すタイトル"
        );
    });
});

describe("公開済みアンケートの編集", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSurvey.mockResolvedValue({
            ...survey,
            canEdit: true,
            mine: {
                draft: {},
                submitted: null,
                updatedAt: "",
                currentSectionId: "section-1",
            },
        });
        mocks.updateSurvey.mockResolvedValue(undefined);
    });

    it("未保存の変更を破棄する前に確認を表示する", async () => {
        render(<SurveyDetail id="survey1" />);
        fireEvent.click(await screen.findByRole("button", { name: "編集" }));
        fireEvent.change(screen.getByRole("textbox", { name: "タイトル" }), {
            target: { value: "変更したタイトル" },
        });
        fireEvent.click(
            screen.getByRole("button", { name: "編集をキャンセル" })
        );

        expect(
            screen.getByText("保存していない変更を破棄しますか？")
        ).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "タイトル" })).toHaveValue(
            "変更したタイトル"
        );
    });
});
