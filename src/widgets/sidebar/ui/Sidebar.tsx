import Image from "next/image";
import { ThemeToggle } from "@/features/theme-toggle";
import { ProfileAvatar } from "@/features/profile-image";
import { auth, signOut } from "@/src/auth";
import { SidebarClient } from "./SidebarClient";
import { SidebarNav } from "./SidebarNav";
import packageJson from "@/package.json";

interface SidebarProps {
    children: React.ReactNode;
}

export default async function Sidebar({ children }: SidebarProps) {
    const session = await auth();
    return (
        <div className="drawer lg:drawer-open max-lg:hidden">
            <input
                id="drawer"
                type="checkbox"
                className="drawer-toggle"
            />
            <div className="drawer-content flex flex-col min-h-screen">
                {children}
            </div>
            <div className="drawer-side z-40">
                <label
                    htmlFor="drawer"
                    aria-label="close sidebar"
                    className="drawer-overlay"
                ></label>
                <div className="bg-base-200 min-h-full w-56 xl:w-64 2xl:w-80 flex flex-col">
                    {/* Logo */}
                    <div className="p-4 flex items-center justify-center">
                        <Image
                            src="/nb_logo.png"
                            alt="NB Logo"
                            width={200}
                            height={80}
                            priority
                            className="h-auto max-w-full"
                        />
                    </div>
                    {/* Menu */}
                    <SidebarNav />

                    {/* Theme Toggle */}
                    <div className="p-4 border-t border-base-300">
                        <ThemeToggle showLabel={true} />
                    </div>

                    {/* User Info & Logout & PWA Install */}
                    {session?.user && (
                        <div className="p-4 border-t border-base-300 space-y-3">
                            <div className="flex items-center gap-3">
                                <ProfileAvatar
                                    name={session.user.name}
                                    size="sm"
                                />
                                <div className="flex-1 min-w-0">
                                    <p
                                        className="font-medium truncate"
                                        style={{
                                            fontSize:
                                                "clamp(0.75rem, 1.2vw, 0.875rem)",
                                        }}
                                    >
                                        {session.user.name}
                                    </p>
                                    <p
                                        className="text-base-content/60 truncate"
                                        style={{
                                            fontSize:
                                                "clamp(0.625rem, 1vw, 0.75rem)",
                                        }}
                                    >
                                        {session.user.email}
                                    </p>
                                </div>
                            </div>
                            <SidebarClient />
                            <form
                                action={async () => {
                                    "use server";
                                    await signOut({ redirectTo: "/login" });
                                }}
                            >
                                <button
                                    type="submit"
                                    className="btn btn-error btn-outline btn-sm w-full justify-start gap-2"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        />
                                    </svg>
                                    ログアウト
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Version Info */}
                    <div className="p-4 border-t border-base-300">
                        <p
                            className="text-base-content/40 text-center"
                            style={{
                                fontSize: "clamp(0.625rem, 1vw, 0.75rem)",
                            }}
                        >
                            NB Portal v{packageJson.version}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
