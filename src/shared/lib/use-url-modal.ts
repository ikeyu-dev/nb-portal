"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type UrlModalParams = Record<string, string | null | undefined>;
type UrlModalHistory = "push" | "replace";

export const useUrlModal = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const modal = searchParams.get("modal");

    const navigateUrlModal = (
        params: UrlModalParams,
        history: UrlModalHistory
    ) => {
        const next = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") {
                next.delete(key);
            } else {
                next.set(key, value);
            }
        });
        const query = next.toString();
        const url = query ? `${pathname}?${query}` : pathname;
        router[history](url, { scroll: false });
    };

    const openModal = (name: string, params: UrlModalParams = {}) => {
        const nextParams = { ...params };
        delete nextParams.modal;
        navigateUrlModal({ modal: name, ...nextParams }, "push");
    };

    const replaceModal = (name: string, params: UrlModalParams = {}) => {
        const nextParams = { ...params };
        delete nextParams.modal;
        navigateUrlModal({ modal: name, ...nextParams }, "replace");
    };

    const closeModal = (keys: string[] = []) => {
        navigateUrlModal(
            Object.fromEntries([
                ["modal", null],
                ...keys.map((key) => [key, null]),
            ]),
            "replace"
        );
    };

    const isModalOpen = (name: string) => modal === name;
    const getModalParam = (name: string) => searchParams.get(name);

    return {
        modal,
        isModalOpen,
        getModalParam,
        openModal,
        replaceModal,
        closeModal,
    };
};
