import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgendaRichTextEditor } from "./AgendaRichTextEditor";

describe("AgendaRichTextEditor", () => {
    it("編集時に書式ツールバーを表示し、既存本文を読み込む", async () => {
        render(
            <AgendaRichTextEditor
                value="既存の議事録"
                editable
            />
        );

        expect(
            await screen.findByRole("button", { name: "太字" })
        ).toBeVisible();
        expect(screen.getByRole("button", { name: "箇条書き" })).toBeVisible();
        expect(screen.getByText("既存の議事録")).toBeVisible();
    });

    it("閲覧時は書式ツールバーを表示せず、本文を同じ書式で表示する", async () => {
        render(
            <AgendaRichTextEditor
                value="閲覧する本文"
                editable={false}
            />
        );

        await waitFor(() =>
            expect(screen.getByText("閲覧する本文")).toBeVisible()
        );
        expect(screen.queryByRole("button", { name: "太字" })).toBeNull();
    });

    it("ツールバーの操作でリストと太字の書式を切り替える", async () => {
        const { container } = render(
            <AgendaRichTextEditor
                value=""
                editable
            />
        );

        fireEvent.click(
            await screen.findByRole("button", { name: "箇条書き" })
        );
        await waitFor(() =>
            expect(container.querySelector("ul li")).not.toBeNull()
        );

        const boldButton = screen.getByRole("button", { name: "太字" });
        fireEvent.click(boldButton);
        await waitFor(() =>
            expect(boldButton).toHaveAttribute("aria-pressed", "true")
        );
    });
});
