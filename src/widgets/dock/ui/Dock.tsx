"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faEllipsis,
    faHouse,
    faNoteSticky,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";

const dockItems = [
    { href: "/home", label: "ホーム", icon: faHouse },
    { href: "/calendar", label: "予定", icon: faCalendarDays },
    { href: "/members", label: "名簿", icon: faUsers },
    { href: "/memo", label: "部会メモ", icon: faNoteSticky },
    { href: "/more", label: "その他", icon: faEllipsis },
];

const moreRoutes = new Set([
    "/documents",
    "/help",
    "/items",
    "/notifications",
    "/tasks",
]);

const resolveCurrentHref = (pathname: string) => {
    if (pathname === "/absence") return "/calendar";
    if (moreRoutes.has(pathname)) return "/more";
    return dockItems.find((item) => item.href === pathname)?.href ?? "/home";
};

export default function Dock() {
    const pathname = usePathname();
    const [navigation, setNavigation] = useState<{
        href: string;
        from: string;
    } | null>(null);
    const pendingHref = navigation?.from === pathname ? navigation.href : null;
    const currentHref = resolveCurrentHref(pathname);
    const activeHref = pendingHref ?? currentHref;
    const activeIndex = Math.max(
        0,
        dockItems.findIndex((item) => item.href === activeHref),
    );

    useEffect(() => {
        if (!navigation) return;

        const timeoutId = window.setTimeout(() => setNavigation(null), 8000);
        return () => window.clearTimeout(timeoutId);
    }, [navigation]);

    return (
        <nav
            aria-label="メインナビゲーション"
            className="app-mobile-dock fixed bottom-0 left-0 right-0 z-30 lg:hidden"
            data-active-index={activeIndex}
        >
            {dockItems.map((item) => {
                const isCurrent = currentHref === item.href;
                const isActive = activeHref === item.href;
                const isPending = pendingHref === item.href;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        aria-current={isCurrent ? "page" : undefined}
                        aria-busy={isPending || undefined}
                        className="app-nav-item app-dock-item"
                        data-active={isActive}
                        data-pending={isPending}
                        onClick={(event) => {
                            if (
                                event.defaultPrevented ||
                                event.button !== 0 ||
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.altKey ||
                                item.href === pathname
                            ) {
                                return;
                            }
                            setNavigation({ href: item.href, from: pathname });
                        }}
                    >
                        <span className="app-dock-icon">
                            <FontAwesomeIcon icon={item.icon} />
                        </span>
                        <span className="app-dock-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
