import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/shared/lib/use-url-modal", async () => {
    const React = await import("react");
    return {
        useUrlModal: () => {
            const [modal, setModal] = React.useState<string | null>(null);
            const [memberId, setMemberId] = React.useState<string | null>(null);
            const updateModal = (
                name: string,
                params?: Record<string, string | null>
            ) => {
                setMemberId(params?.member || null);
                setModal(name);
            };

            return {
                modal,
                getModalParam: (key: string) =>
                    key === "member" ? memberId : null,
                openModal: updateModal,
                replaceModal: updateModal,
                closeModal: () => {
                    setModal(null);
                    setMemberId(null);
                },
            };
        },
    };
});

import MembersPage from "./page";

const membersData = {
    headers: [
        "studentNumber",
        "name",
        "nickname",
        "isJoinedLine",
        "lineName",
        "isJoinedDiscord",
        "isSigned",
        "permission",
    ],
    members: [
        {
            rowNumber: 2,
            values: [
                "a243456",
                "放研 太郎",
                "たろう",
                true,
                "Taro LINE",
                true,
                true,
                "HEAD",
            ],
        },
        {
            rowNumber: 3,
            values: [
                "b253456",
                "放研 花子",
                "はな",
                false,
                "Hanako LINE",
                false,
                false,
                "NORMAL",
            ],
        },
    ],
};

const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

describe("MembersPage", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal("fetch", vi.fn());
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: membersData })
        );
    });

    it("名簿を取得し、文字列と入学年度で絞り込む", async () => {
        render(<MembersPage />);

        expect(await screen.findByText("たろう")).toBeInTheDocument();
        expect(screen.getByText("はな")).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith("/api/backend?path=members", {
            cache: "no-store",
        });

        fireEvent.change(screen.getByPlaceholderText("検索"), {
            target: { value: "花子" },
        });
        expect(screen.queryByText("たろう")).toBeNull();
        expect(screen.getByText("はな")).toBeInTheDocument();

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "2024" },
        });
        expect(screen.getByText("該当する名簿データがありません")).toBeInTheDocument();
    });

    it("部員を追加し、成功後にモーダルを閉じて一覧へ反映する", async () => {
        const createdValues = [
            "c263456",
            "放研 次郎",
            "じろう",
            false,
            "Jiro LINE",
            false,
            false,
            "TMP_NORMAL",
        ];
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                success: true,
                rowNumber: 4,
                values: createdValues,
            })
        );
        render(<MembersPage />);
        await screen.findByText("たろう");

        fireEvent.click(screen.getByRole("button", { name: "追加" }));
        const dialog = screen.getByRole("dialog", { name: "名簿に追加" });
        const textboxes = within(dialog).getAllByRole("textbox");
        fireEvent.change(textboxes[0], { target: { value: "c263456" } });
        fireEvent.change(textboxes[1], { target: { value: "放研 次郎" } });
        fireEvent.change(textboxes[2], { target: { value: "じろう" } });
        fireEvent.change(textboxes[3], { target: { value: "Jiro LINE" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "追加" }));

        await waitFor(() => {
            const options = vi.mocked(fetch).mock.calls[1][1] as RequestInit;
            expect(JSON.parse(String(options.body))).toEqual({
                values: createdValues,
            });
        });
        await waitFor(() =>
            expect(
                screen.queryByRole("dialog", { name: "名簿に追加" })
            ).toBeNull()
        );
        expect(screen.getByText("じろう")).toBeInTheDocument();
    });

    it("編集画面から確認して部員を削除し、後続行番号を詰める", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true })
        );
        render(<MembersPage />);
        await screen.findByText("たろう");

        fireEvent.click(screen.getByText("たろう"));
        const editDialog = screen.getByRole("dialog", { name: "名簿を編集" });
        fireEvent.click(within(editDialog).getByRole("button", { name: "削除" }));
        const deleteDialog = screen.getByRole("dialog", {
            name: "名簿から削除",
        });
        fireEvent.click(within(deleteDialog).getByRole("button", { name: "削除" }));

        await waitFor(() =>
            expect(fetch).toHaveBeenNthCalledWith(2, "/api/members", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rowNumber: 2 }),
            })
        );
        await waitFor(() => expect(screen.queryByText("たろう")).toBeNull());
        expect(screen.getByText("はな")).toBeInTheDocument();
    });
});
