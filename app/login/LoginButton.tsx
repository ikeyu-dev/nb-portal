"use client";

import { useFormStatus } from "react-dom";

export function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            className="btn btn-primary gap-2"
            disabled={pending}
        >
            {pending ? (
                <>
                    <span className="loading loading-spinner loading-sm"></span>
                    ログイン中...
                </>
            ) : (
                <>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 23 23"
                        className="w-5 h-5"
                    >
                        <path
                            fill="currentColor"
                            d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"
                        />
                    </svg>
                    Microsoftでログイン
                </>
            )}
        </button>
    );
}
