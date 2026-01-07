"use client";

import { useState } from "react";

/**
 * 部会メモのデモコンポーネント
 */
export function DemoMemo() {
    const [title, setTitle] = useState("1/15(水) 新年会の打ち合わせ");
    const [details, setDetails] = useState("場所は学友会館を予定\n参加人数を確認中");
    const [copyStatus, setCopyStatus] = useState<"idle" | "success">("idle");

    const generatePreview = () => {
        const titleLine = `-   ${title}`;
        if (!details.trim()) {
            return titleLine;
        }
        const detailLines = details
            .split("\n")
            .map((line) => `    -   ${line}`)
            .join("\n");
        return `${titleLine}\n${detailLines}`;
    };

    const handleCopy = () => {
        setCopyStatus("success");
        setTimeout(() => setCopyStatus("idle"), 2000);
    };

    return (
        <div className="space-y-4">
            {/* 入力例 */}
            <div className="card bg-base-200 p-3">
                <div className="space-y-2">
                    <input
                        type="text"
                        className="input input-bordered input-sm w-full"
                        placeholder="予定のタイトル"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <textarea
                        className="textarea textarea-bordered textarea-sm w-full"
                        placeholder="詳細（任意、複数行可）"
                        rows={2}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                    />
                </div>
            </div>

            {/* プレビュー */}
            <div className="space-y-2">
                <h4 className="font-semibold text-sm">出力プレビュー</h4>
                <pre className="bg-base-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap border border-base-300">
                    {generatePreview()}
                </pre>
            </div>

            {/* コピーボタン */}
            <button
                type="button"
                className={`btn btn-sm w-full ${
                    copyStatus === "success" ? "btn-success" : "btn-primary"
                }`}
                onClick={handleCopy}
            >
                {copyStatus === "success"
                    ? "コピーしました（デモ）"
                    : "マークダウンをコピー"}
            </button>

            <p className="text-xs text-base-content/50 text-center">
                これはデモ表示です。実際のコピーは行われません。
            </p>
        </div>
    );
}
