"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { AnimatedState } from "@/src/shared/ui/AnimatedState";

interface ThemeToggleProps {
    showLabel?: boolean;
}

export default function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);
    const isDark = theme === "dark";

    useEffect(() => {
        const frameId = requestAnimationFrame(() => {
            const savedTheme = localStorage.getItem("theme") as
                | "light"
                | "dark";
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
            const initialTheme =
                savedTheme || (prefersDark ? "dark" : "light");
            setTheme(initialTheme);
            setMounted(true);
            document.documentElement.setAttribute("data-theme", initialTheme);
        });
        return () => cancelAnimationFrame(frameId);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    const toggleControl = (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="テーマを切り替え"
            className={`relative h-7 w-14 rounded-full border motion-safe:transition-colors motion-safe:duration-200 ${
                isDark
                    ? "border-base-content/60 bg-base-100"
                    : "border-base-content/30 bg-base-200"
            }`}
            onClick={toggleTheme}
            disabled={!mounted}
        >
            <span
                data-theme-thumb="true"
                className={`absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-base-100 shadow-sm motion-safe:transition-[translate] motion-safe:duration-300 motion-safe:ease-out ${
                    isDark ? "translate-x-7" : "translate-x-1"
                }`}
            >
                <AnimatedState
                    activeKey={isDark ? "dark" : "light"}
                    items={[
                        {
                            key: "light",
                            activeClassName: "rotate-0",
                            inactiveClassName: "rotate-45",
                            content: (
                                <FontAwesomeIcon
                                    icon={faSun}
                                    className="h-3.5 w-3.5 text-base-content"
                                />
                            ),
                        },
                        {
                            key: "dark",
                            activeClassName: "rotate-0",
                            inactiveClassName: "-rotate-45",
                            content: (
                                <FontAwesomeIcon
                                    icon={faMoon}
                                    className="h-3.5 w-3.5 text-base-content"
                                />
                            ),
                        },
                    ]}
                />
            </span>
        </button>
    );

    if (!mounted) {
        return (
            <div
                className={`flex items-center ${
                    showLabel ? "justify-between w-full" : "justify-center"
                }`}
            >
                {toggleControl}
            </div>
        );
    }

    return (
        <div
            className={`flex items-center ${
                showLabel ? "justify-between w-full" : "justify-center"
            }`}
        >
            {showLabel && (
                <span className="text-sm">
                    ダークモード：{isDark ? "ON" : "OFF"}
                </span>
            )}
            {toggleControl}
        </div>
    );
}
