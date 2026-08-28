import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUrlModal } from "./use-url-modal";

let currentQuery = "";

vi.mock("next/navigation", () => ({
    usePathname: () => "/items",
    useSearchParams: () => new URLSearchParams(currentQuery),
}));

describe("useUrlModal", () => {
    let pushState: ReturnType<typeof vi.spyOn>;
    let replaceState: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        currentQuery = "filter=MIC";
        pushState = vi
            .spyOn(window.history, "pushState")
            .mockImplementation(() => undefined);
        replaceState = vi
            .spyOn(window.history, "replaceState")
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("現在のモーダル名と対象パラメータを返す", () => {
        currentQuery = "modal=item-edit&item=MIC001";
        const { result } = renderHook(() => useUrlModal());

        expect(result.current.modal).toBe("item-edit");
        expect(result.current.isModalOpen("item-edit")).toBe(true);
        expect(result.current.isModalOpen("item-delete")).toBe(false);
        expect(result.current.getModalParam("item")).toBe("MIC001");
    });

    it("モーダルを開くと履歴へ追加し、既存クエリを保持する", () => {
        const { result } = renderHook(() => useUrlModal());

        act(() => {
            result.current.openModal("item-edit", { item: "MIC001" });
        });

        expect(pushState).toHaveBeenCalledWith(
            null,
            "",
            "/items?filter=MIC&modal=item-edit&item=MIC001",
        );
        expect(replaceState).not.toHaveBeenCalled();
    });

    it("親モーダルへの遷移は現在の履歴を置き換える", () => {
        currentQuery = "modal=response-form&event=EVENT001";
        const { result } = renderHook(() => useUrlModal());

        act(() => {
            result.current.replaceModal("schedule-response", {
                event: "EVENT001",
            });
        });

        expect(replaceState).toHaveBeenCalledWith(
            null,
            "",
            "/items?modal=schedule-response&event=EVENT001",
        );
        expect(pushState).not.toHaveBeenCalled();
    });

    it("完了後はモーダル用クエリだけを削除して履歴を置き換える", () => {
        currentQuery = "filter=MIC&modal=item-edit&item=MIC001";
        const { result } = renderHook(() => useUrlModal());

        act(() => {
            result.current.closeModal(["item"]);
        });

        expect(replaceState).toHaveBeenCalledWith(
            null,
            "",
            "/items?filter=MIC"
        );
        expect(pushState).not.toHaveBeenCalled();
    });
});
