"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";

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
            <FontAwesomeIcon
                icon={faCircleQuestion}
                className="text-xl"
            />
        </Link>
    );
}
