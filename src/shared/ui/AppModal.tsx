"use client";

import { useEffect, useState, type ReactNode } from "react";

const EXIT_ANIMATION_MS = 180;

type AppModalProps = {
    children: ReactNode;
    open?: boolean;
    onClose: () => void;
    ariaLabel?: string;
    boxClassName?: string;
};

export function AppModal({
    children,
    open = true,
    onClose,
    ariaLabel = "モーダル",
    boxClassName = "max-w-2xl max-h-[calc(100dvh-8rem)] overflow-y-auto p-6 sm:max-h-[calc(100dvh-10rem)]",
}: AppModalProps) {
    const [isRendered, setIsRendered] = useState(open);
    const [isVisible, setIsVisible] = useState(false);

    if (open && !isRendered) {
        setIsRendered(true);
    }

    useEffect(() => {
        if (open) {
            const frameId = requestAnimationFrame(() => setIsVisible(true));
            return () => cancelAnimationFrame(frameId);
        }

        const timeoutId = window.setTimeout(() => {
            setIsVisible(false);
            setIsRendered(false);
        }, EXIT_ANIMATION_MS);
        return () => window.clearTimeout(timeoutId);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, open]);

    if (!isRendered) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className={`modal app-modal modal-middle z-[999] px-4 ${
                open && isVisible ? "modal-open" : ""
            }`}
        >
            <button
                type="button"
                aria-label="モーダルを閉じる"
                className="modal-backdrop cursor-default"
                onClick={onClose}
            />
            <div className={`modal-box w-11/12 ${boxClassName}`}>
                {children}
            </div>
        </div>
    );
}
