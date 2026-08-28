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
                    className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${
                        loading ? "invisible" : ""
                    }`}
                >
                    {children}
                </span>
                <span
                    data-button-state="loading"
                    aria-hidden={!loading || undefined}
                    className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${
                        loading ? "" : "invisible"
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
