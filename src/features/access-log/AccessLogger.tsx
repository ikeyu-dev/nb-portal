"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { formatJstTimestamp } from "@/src/shared/lib/jst-date";

const TRACKED_PATHS = new Set([
    "/home",
    "/calendar",
    "/members",
    "/items",
    "/absence",
    "/documents",
    "/memo",
    "/notifications",
    "/more",
]);

const ACCESS_LOG_THROTTLE_MS = 5 * 60 * 1000;
const LAST_LOG_PREFIX = "nb-portal-access-log-last:";

export function AccessLogger() {
    const pathname = usePathname();

    useEffect(() => {
        if (!TRACKED_PATHS.has(pathname)) return;

        const storageKey = `${LAST_LOG_PREFIX}${pathname}`;
        const now = Date.now();
        const lastLoggedAt = Number(localStorage.getItem(storageKey) || "0");
        if (now - lastLoggedAt < ACCESS_LOG_THROTTLE_MS) return;

        localStorage.setItem(storageKey, String(now));

        void fetch("/api/access-log", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                logs: [
                    {
                        path: pathname,
                        clientTimestamp: formatJstTimestamp(new Date(now)),
                    },
                ],
            }),
            cache: "no-store",
            keepalive: true,
        }).catch(() => {
            localStorage.removeItem(storageKey);
        });
    }, [pathname]);

    return null;
}
