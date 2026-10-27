"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBell,
    faCalendarDays,
    faFileLines,
    faHouse,
    faListCheck,
    faMicrophone,
    faNoteSticky,
    faSquarePollVertical,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
    { href: "/home", label: "ホーム", icon: faHouse },
    { href: "/calendar", label: "カレンダー", icon: faCalendarDays },
    { href: "/tasks", label: "タスク", icon: faListCheck },
    { href: "/surveys", label: "アンケート", icon: faSquarePollVertical },
    { href: "/items", label: "機材一覧", icon: faMicrophone },
    { href: "/members", label: "名簿", icon: faUsers },
    { href: "/notifications", label: "お知らせ", icon: faBell },
    { href: "/documents", label: "資料", icon: faFileLines },
    { href: "/memo", label: "部会メモ", icon: faNoteSticky },
];

export function SidebarNav({ permission }: { permission?: string }) {
    const pathname = usePathname();
    const visibleItems =
        permission === "HEAD" ||
        permission === "SUB_HEAD" ||
        permission === "ACCOUNTANT"
            ? [
                  ...navItems,
                  {
                      href: "/executive-meetings",
                      label: "議事録",
                      icon: faNoteSticky,
                  },
              ]
            : navItems;

    return (
        <ul
            className="menu p-4 flex-1 w-full"
            style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}
        >
            {visibleItems.map((item) => (
                <li key={item.href}>
                    <Link
                        href={item.href}
                        className={`app-nav-item ${pathname === item.href || (item.href === "/executive-meetings" && pathname.startsWith("/executive-meetings/")) ? "text-primary" : ""}`}
                    >
                        <FontAwesomeIcon
                            icon={item.icon}
                            className="w-5 text-base"
                        />
                        {item.label}
                    </Link>
                </li>
            ))}
        </ul>
    );
}
