import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/shared/lib/use-url-modal", async () => {
    const React = await import("react");
    return {
        useUrlModal: () => {
            const [modal, setModal] = React.useState<string | null>(null);
            const [itemId, setItemId] = React.useState<string | null>(null);
            const setUrlModal = (
                name: string,
                params?: Record<string, string | null>
            ) => {
                setItemId(params?.item || null);
                setModal(name);
            };
            return {
                modal,
                getModalParam: (key: string) => (key === "item" ? itemId : null),
                openModal: setUrlModal,
                replaceModal: setUrlModal,
                closeModal: () => {
                    setModal(null);
                    setItemId(null);
                },
            };
        },
    };
});

vi.mock("@/src/shared/lib/client-cache", () => ({
    clearClientCache: vi.fn(),
    getClientCacheEntry: vi.fn(() => null),
    getStaleClientCacheEntry: vi.fn(() => null),
    setClientCache: vi.fn(),
}));

vi.mock("@/src/features/help", () => ({
    HelpButton: () => <button type="button">ヘルプ</button>,
}));

import ItemsPage from "./page";

const item = {
    ITEM_ID: "MIC-001",
    NAME: "SHURE SM58",
    WHEN: "2026/09/01",
};

const jsonResponse = (data: unknown) =>
    new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
    });

describe("ItemsPage", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, data: [item] })
        );
    });

    it("登録後の新しい機材行を入場状態にする", async () => {
        const created = { ...item, ITEM_ID: "MIC-002", NAME: "SHURE SM57" };
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
            .mockResolvedValueOnce(
                jsonResponse({ success: true, data: [item, created] })
            );
        render(<ItemsPage />);
        await screen.findAllByText("SHURE SM58");

        fireEvent.click(screen.getAllByRole("button", { name: "追加" })[0]);
        const dialog = screen.getByRole("dialog", { name: "機材を登録" });
        fireEvent.change(within(dialog).getByPlaceholderText("例: SHURE SM58"), {
            target: { value: "SHURE SM57" },
        });
        fireEvent.click(within(dialog).getByRole("button", { name: "登録" }));

        const createdRows = await screen.findAllByText("SHURE SM57");
        expect(createdRows[0].closest("tr")).toHaveAttribute(
            "data-motion",
            "enter"
        );
    });

    it("削除成功後は退場状態を経て機材行を取り除く", async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
            .mockResolvedValueOnce(jsonResponse({ success: true, data: [] }));
        render(<ItemsPage />);
        const itemNames = await screen.findAllByText("SHURE SM58");

        fireEvent.click(itemNames[0].closest("tr")!);
        const editDialog = screen.getByRole("dialog", { name: "機材を編集" });
        fireEvent.click(within(editDialog).getByRole("button", { name: "削除" }));
        const deleteDialog = screen.getByRole("dialog", { name: "機材を削除" });
        fireEvent.click(within(deleteDialog).getByRole("button", { name: "削除" }));

        await waitFor(() =>
            expect(itemNames[0].closest("tr")).toHaveAttribute(
                "data-motion",
                "exit"
            )
        );
        await waitFor(() =>
            expect(screen.queryByText("SHURE SM58")).toBeNull()
        );
    });
});
