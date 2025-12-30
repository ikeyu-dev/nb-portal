"use client";

import Link from "next/link";

interface HelpButtonProps {
    sectionId: string;
    size?: "sm" | "md";
}

/**
 * インラインヘルプボタン
 * 各ページのヘッダーに配置し、クリックでヘルプページの該当セクションへジャンプ
 */
export function HelpButton({ sectionId, size = "sm" }: HelpButtonProps) {
    const sizeClasses = {
        sm: "btn-sm w-8 h-8",
        md: "w-10 h-10",
    };

    return (
        <Link
            href={`/help#${sectionId}`}
            className={`btn btn-circle btn-ghost ${sizeClasses[size]}`}
            title="ヘルプを表示"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        </Link>
    );
}
