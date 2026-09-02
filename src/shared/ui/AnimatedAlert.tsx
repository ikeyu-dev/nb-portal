"use client";

import { useEffect, useState, type ReactNode } from "react";

const EXIT_ANIMATION_MS = 160;

type AlertVariant = "error" | "info" | "success" | "warning";

type AnimatedAlertProps = {
    show: boolean;
    children: ReactNode;
    variant: AlertVariant;
    className?: string;
};

export function AnimatedAlert({
    show,
    children,
    variant,
    className = "",
}: AnimatedAlertProps) {
    const [isRendered, setIsRendered] = useState(show);
    const [isVisible, setIsVisible] = useState(false);
    const [displayedContent, setDisplayedContent] = useState(children);

    if (show) {
        if (!isRendered) setIsRendered(true);
    }

    useEffect(() => {
        if (show) {
            const frameId = requestAnimationFrame(() => {
                setDisplayedContent(children);
                setIsVisible(true);
            });
            return () => cancelAnimationFrame(frameId);
        }

        if (!isRendered) return;

        const timeoutId = window.setTimeout(() => {
            setIsVisible(false);
            setIsRendered(false);
        }, EXIT_ANIMATION_MS);
        return () => window.clearTimeout(timeoutId);
    }, [children, isRendered, show]);

    if (!isRendered) return null;

    const state = show ? (isVisible ? "open" : "opening") : "closed";

    return (
        <div
            role="alert"
            data-state={state}
            className={`alert alert-${variant} app-alert ${className}`}
        >
            {displayedContent}
        </div>
    );
}
