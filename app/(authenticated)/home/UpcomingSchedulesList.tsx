"use client";

import { useId, useState, type ReactNode } from "react";

const PREVIEW_COUNT = 7;

export function UpcomingSchedulesList({ children }: { children: ReactNode[] }) {
    const [expanded, setExpanded] = useState(false);
    const listId = useId();
    const visibleSchedules = expanded
        ? children
        : children.slice(0, PREVIEW_COUNT);

    return (
        <>
            <div
                id={listId}
                className="overflow-hidden rounded-xl bg-base-100 ring-1 ring-base-300/70 divide-y divide-base-300/70"
            >
                {visibleSchedules}
            </div>
            {children.length > PREVIEW_COUNT && (
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        className="link link-primary text-sm"
                        aria-expanded={expanded}
                        aria-controls={listId}
                        onClick={() => setExpanded((current) => !current)}
                    >
                        {expanded ? "7件表示に戻す" : "すべての予定を見る"}
                    </button>
                </div>
            )}
        </>
    );
}
