import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AssignedParticipants } from "./AssignedParticipants";

vi.mock("@/src/shared/api/client", () => ({ getMembers: async () => ({ success: true, data: { members: [
    { values: ["a001", "部員", "たろう", "", "", "", "", "NORMAL"] },
    { values: ["b002", "卒業生", "はな", "", "", "", "", "OBOG"] },
] } }) }));
const response = (data: unknown, status = 200) => new Response(JSON.stringify({ success: status === 200, data }), { status });
const initial = { revision: 2, canManage: true, participants: [{ studentNumber: "a001", displayName: "たろう" }] };
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

it("作成者は役職に関係なく選択でき、版番号付きで保存する", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(initial)).mockResolvedValueOnce(response({ ...initial, revision: 3, participants: [{ studentNumber: "b002", displayName: "はな" }] }));
    const onSaved = vi.fn();
    render(<AssignedParticipants eventId="test" onSaved={onSaved} onEditSchedule={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "編集" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "参加者を編集" }));
    expect(screen.queryByRole("button", { name: "編集" })).toBeNull();
    fireEvent.click(await screen.findByRole("checkbox", { name: /たろう/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /はな/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "保存" })).toBeNull());
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toEqual({ eventId: "test", studentNumbers: ["b002"], expectedRevision: 2 });
    expect(screen.getByText("はな")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
});

it("競合時は選択を勝手に上書きせず、再取得を求める", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(initial)).mockResolvedValueOnce(response(null, 409));
    render(<AssignedParticipants eventId="test" />);
    fireEvent.click(await screen.findByRole("button", { name: "参加者を編集" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /はな/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText(/別の操作で更新されています/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /はな/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "再取得" })).toBeInTheDocument();
});

it("取得失敗を0人と表示しない", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    render(<AssignedParticipants eventId="test" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("参加者を取得できませんでした");
    expect(screen.queryByText("参加者は指定されていません")).toBeNull();
});

it("0人に変更するときは解除を確認してから保存する", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(initial)).mockResolvedValueOnce(response({ ...initial, revision: 3, participants: [] }));
    render(<AssignedParticipants eventId="test" />);
    fireEvent.click(await screen.findByRole("button", { name: "参加者を編集" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /たろう/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "解除する" }));
    expect(await screen.findByText("参加者は指定されていません")).toBeInTheDocument();
});

it("全員解除が競合しても、再取得後は参加者を選び直せる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(initial)).mockResolvedValueOnce(response(null, 409)).mockResolvedValueOnce(response({ ...initial, revision: 3 }));
    render(<AssignedParticipants eventId="test" />);
    fireEvent.click(await screen.findByRole("button", { name: "参加者を編集" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /たろう/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    fireEvent.click(screen.getByRole("button", { name: "解除する" }));
    fireEvent.click(await screen.findByRole("button", { name: "再取得" }));
    fireEvent.click(await screen.findByRole("button", { name: "参加者を編集" }));
    expect(await screen.findByRole("checkbox", { name: /たろう/ })).toBeChecked();
});
