"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type UrlModalParams = Record<string, string | null | undefined>;

export const useUrlModal = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateUrlModal = (params: UrlModalParams, replace = false) => {
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
        if (replace) {
            router.replace(url, { scroll: false });
        } else {
            router.push(url, { scroll: false });
        }
    };

    const clearUrlModal = (keys: string[] = []) => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("modal");
        keys.forEach((key) => next.delete(key));
        const query = next.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    return { searchParams, updateUrlModal, clearUrlModal };
};
