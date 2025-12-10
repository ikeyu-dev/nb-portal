import Image from "next/image";
import { ThemeToggle } from "@/features/theme-toggle";

interface SidebarProps {
    children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
    return (
        <div className="drawer md:drawer-open max-md:hidden">
            <input id="drawer" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content flex flex-col min-h-screen">
                {children}
            </div>
            <div className="drawer-side z-40">
                <label
                    htmlFor="drawer"
                    aria-label="close sidebar"
                    className="drawer-overlay"
                ></label>
                <div className="bg-base-200 min-h-full w-80 flex flex-col">
                    {/* Logo */}
                    <div className="p-4 flex items-center justify-center">
                        <Image
                            src="/nb_logo.png"
                            alt="NB Logo"
                            width={200}
                            height={80}
                            priority
                            className="w-auto h-auto max-w-full"
                        />
                    </div>
                    {/* Menu */}
                    <ul className="menu p-4 flex-1">
                        <li>
                            <a>Sidebar Item 1</a>
                        </li>
                        <li>
                            <a>Sidebar Item 2</a>
                        </li>
                    </ul>

                    {/* Theme Toggle */}
                    <div className="p-4 border-t border-base-300">
                        <ThemeToggle showLabel={true} />
                    </div>
                </div>
            </div>
        </div>
    );
}
