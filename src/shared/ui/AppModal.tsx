"use client";

import type { ReactNode } from "react";

type AppModalProps = {
    children: ReactNode;
    onClose: () => void;
    ariaLabel?: string;
    boxClassName?: string;
};

export function AppModal({
    children,
    onClose,
    ariaLabel = "モーダル",
    boxClassName = "max-w-2xl max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)]",
}: AppModalProps) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className="fixed inset-0 z-[999] overflow-y-auto bg-black/40 px-4"
        >
            <button
                type="button"
                aria-label="モーダルを閉じる"
                className="fixed inset-0 h-full w-full cursor-default"
                onClick={onClose}
            />
            <div
                className="relative z-10 flex min-h-full items-center justify-center py-16 sm:py-20"
                onClick={onClose}
            >
                <div
                    className={`w-11/12 rounded-box bg-base-100 shadow-2xl ${boxClassName}`}
                    onClick={(event) => event.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
