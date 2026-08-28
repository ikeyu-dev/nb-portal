import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUrlModal } from "./use-url-modal";

const push = vi.fn();
const replace = vi.fn();
let currentQuery = "";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace }),
    usePathname: () => "/items",
    useSearchParams: () => new URLSearchParams(currentQuery),
}));

describe("useUrlModal", () => {
    beforeEach(() => {
        currentQuery = "filter=MIC";
        push.mockReset();
        replace.mockReset();
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

        expect(push).toHaveBeenCalledWith(
            "/items?filter=MIC&modal=item-edit&item=MIC001",
            { scroll: false }
        );
        expect(replace).not.toHaveBeenCalled();
    });

    it("親モーダルへの遷移は現在の履歴を置き換える", () => {
        currentQuery = "modal=response-form&event=EVENT001";
        const { result } = renderHook(() => useUrlModal());

        act(() => {
            result.current.replaceModal("schedule-response", {
                event: "EVENT001",
            });
        });

        expect(replace).toHaveBeenCalledWith(
            "/items?modal=schedule-response&event=EVENT001",
            { scroll: false }
        );
        expect(push).not.toHaveBeenCalled();
    });

    it("完了後はモーダル用クエリだけを削除して履歴を置き換える", () => {
        currentQuery = "filter=MIC&modal=item-edit&item=MIC001";
        const { result } = renderHook(() => useUrlModal());

        act(() => {
            result.current.closeModal(["item"]);
        });

        expect(replace).toHaveBeenCalledWith("/items?filter=MIC", {
            scroll: false,
        });
        expect(push).not.toHaveBeenCalled();
    });
});
