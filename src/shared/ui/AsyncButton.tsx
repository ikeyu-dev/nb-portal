"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type AsyncButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingLabel?: ReactNode;
    spinnerClassName?: string;
};

export function AsyncButton({
    children,
    loading = false,
    loadingLabel,
    spinnerClassName = "loading-sm",
    disabled,
    type = "button",
    ...props
}: AsyncButtonProps) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
        >
            <span className="grid place-items-center">
                <span
                    data-button-state="idle"
                    aria-hidden={loading || undefined}
                    className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 motion-safe:transition-[opacity,scale] motion-safe:duration-150 motion-safe:ease-out ${
                        loading
                            ? "pointer-events-none opacity-0 scale-95"
                            : "opacity-100 scale-100"
                    }`}
                >
                    {children}
                </span>
                <span
                    data-button-state="loading"
                    aria-hidden={!loading || undefined}
                    className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 motion-safe:transition-[opacity,scale] motion-safe:duration-150 motion-safe:ease-out ${
                        loading
                            ? "opacity-100 scale-100"
                            : "pointer-events-none opacity-0 scale-95"
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`loading loading-spinner ${spinnerClassName}`}
                    />
                    {loadingLabel ?? children}
                </span>
            </span>
        </button>
    );
}
