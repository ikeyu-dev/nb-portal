import { describe, expect, it } from "vitest";
import {
    parseAgendaDocument,
    serializeAgendaDocument,
} from "./rich-text-content";

describe("議事録のリッチテキスト保存", () => {
    it("空の本文も編集開始できる空段落として復元する", () => {
        expect(parseAgendaDocument("")).toEqual({
            type: "doc",
            content: [{ type: "paragraph" }],
        });
    });

    it("エディターのJSONを保存用文字列へ変換して復元できる", () => {
        const document = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: "決定事項",
                            marks: [{ type: "bold" }],
                        },
                    ],
                },
            ],
        };

        expect(parseAgendaDocument(serializeAgendaDocument(document))).toEqual(
            document
        );
    });

    it("既存のプレーンテキストを段落と改行として読み込む", () => {
        expect(parseAgendaDocument("1行目\n同じ段落\n\n次の段落")).toEqual({
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "1行目" },
                        { type: "hardBreak" },
                        { type: "text", text: "同じ段落" },
                    ],
                },
                {
                    type: "paragraph",
                    content: [{ type: "text", text: "次の段落" }],
                },
            ],
        });
    });
});
