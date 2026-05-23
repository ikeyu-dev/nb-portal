"use client";

import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrosoft } from "@fortawesome/free-brands-svg-icons";

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
                    <FontAwesomeIcon
                        icon={faMicrosoft}
                        className="text-xl"
                    />
                    Microsoftでログイン
                </>
            )}
        </button>
    );
}
