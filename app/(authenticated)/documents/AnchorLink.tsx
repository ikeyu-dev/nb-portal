"use client";

interface AnchorLinkProps {
    targetId: string;
    children: React.ReactNode;
    className?: string;
}

export default function AnchorLink({
    targetId,
    children,
    className,
}: AnchorLinkProps) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        // 同じIDを持つすべての要素を取得
        const elements = document.querySelectorAll(`#${targetId}`);

        // 可視状態の要素を見つける
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);

            // 要素が表示されているかチェック
            if (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0
            ) {
                element.scrollIntoView({ behavior: "smooth" });
                // URLにハッシュを追加
                history.pushState(null, "", `#${targetId}`);
                break;
            }
        }
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleClick}
            className={className}
        >
            {children}
        </a>
    );
}
