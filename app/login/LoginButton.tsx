"use client";

import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrosoft } from "@fortawesome/free-brands-svg-icons";
import { AsyncButton } from "@/src/shared/ui/AsyncButton";

export function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <AsyncButton
            type="submit"
            className="btn btn-primary gap-2"
            loading={pending}
            loadingLabel="ログイン中"
        >
            <FontAwesomeIcon icon={faMicrosoft} className="text-xl" />
            Microsoftでログイン
        </AsyncButton>
    );
}
