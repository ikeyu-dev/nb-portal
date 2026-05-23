"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBell,
    faCalendarDays,
    faEllipsis,
    faFileLines,
    faHouse,
    faMicrophone,
    faNoteSticky,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";

const dockItems = [
    { href: "/home", label: "Home", icon: faHouse },
    { href: "/calendar", label: "Calendar", icon: faCalendarDays },
    { href: "/items", label: "Items", icon: faMicrophone },
    { href: "/members", label: "Members", icon: faUsers },
    { href: "/notifications", label: "News", icon: faBell },
    { href: "/documents", label: "Docs", icon: faFileLines },
    { href: "/memo", label: "Memo", icon: faNoteSticky },
    { href: "/more", label: "More", icon: faEllipsis },
];

export default function Dock() {
    const pathname = usePathname();

    return (
        <div
            className="dock dock-md fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-base-100 border-t border-base-300 pt-9"
            style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)",
            }}
        >
            {dockItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`transition-transform ${
                        pathname === item.href ? "text-primary scale-110" : ""
                    }`}
                >
                    <FontAwesomeIcon
                        icon={item.icon}
                        className="text-[1.35rem] leading-none"
                    />
                    <span
                        className="dock-label"
                        style={{
                            fontSize: "clamp(0.625rem, 2vw, 0.75rem)",
                        }}
                    >
                        {item.label}
                    </span>
                </Link>
            ))}
        </div>
    );
}
