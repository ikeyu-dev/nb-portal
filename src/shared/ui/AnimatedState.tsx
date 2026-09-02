import type { ReactNode } from "react";

type AnimatedStateItem = {
    key: string;
    content: ReactNode;
    activeClassName?: string;
    inactiveClassName?: string;
};

type AnimatedStateProps = {
    activeKey: string;
    items: AnimatedStateItem[];
    className?: string;
};

export function AnimatedState({
    activeKey,
    items,
    className = "",
}: AnimatedStateProps) {
    return (
        <span className={`inline-grid place-items-center ${className}`}>
            {items.map((item) => {
                const isActive = item.key === activeKey;
                return (
                    <span
                        key={item.key}
                        data-state-key={item.key}
                        data-active={isActive}
                        aria-hidden={!isActive || undefined}
                        className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 motion-safe:transition-[opacity,scale,rotate] motion-safe:duration-200 motion-safe:ease-out ${
                            isActive
                                ? `opacity-100 scale-100 ${item.activeClassName ?? ""}`
                                : `pointer-events-none opacity-0 scale-90 ${item.inactiveClassName ?? ""}`
                        }`}
                    >
                        {item.content}
                    </span>
                );
            })}
        </span>
    );
}
