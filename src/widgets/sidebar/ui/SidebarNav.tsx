"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBell,
    faCalendarDays,
    faFileLines,
    faHouse,
    faMicrophone,
    faNoteSticky,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
    { href: "/home", label: "ホーム", icon: faHouse },
    { href: "/calendar", label: "カレンダー", icon: faCalendarDays },
    { href: "/items", label: "機材一覧", icon: faMicrophone },
    { href: "/members", label: "名簿", icon: faUsers },
    { href: "/notifications", label: "お知らせ", icon: faBell },
    { href: "/documents", label: "資料", icon: faFileLines },
    { href: "/memo", label: "部会メモ", icon: faNoteSticky },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <ul
            className="menu p-4 flex-1 w-full"
            style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}
        >
            {navItems.map((item) => (
                <li key={item.href}>
                    <Link
                        href={item.href}
                        className={`transition-transform hover:scale-105 ${pathname === item.href ? "text-primary" : ""}`}
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
