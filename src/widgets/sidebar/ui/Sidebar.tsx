import Image from "next/image";
import type { Session } from "next-auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "@/features/theme-toggle";
import { ProfileAvatar } from "@/features/profile-image";
import { signOut } from "@/src/auth";
import { SidebarClient } from "./SidebarClient";
import { SidebarNav } from "./SidebarNav";
import packageJson from "@/package.json";

interface SidebarProps {
    session: Session | null;
}

export default function Sidebar({ session }: SidebarProps) {
    const displayName =
        session?.displayName ||
        session?.memberName ||
        session?.user?.name ||
        session?.studentId ||
        null;

    return (
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col overflow-y-auto bg-base-200 lg:flex xl:w-64 2xl:w-80">
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

            <SidebarNav />

            <div className="p-4 border-t border-base-300">
                <ThemeToggle showLabel={true} />
            </div>

            {session?.user && (
                <div className="p-4 border-t border-base-300 space-y-3">
                    <div className="flex items-center gap-3">
                        <ProfileAvatar
                            name={displayName}
                            imageUrl={session.profileImage}
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
                                {displayName}
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
                            <FontAwesomeIcon
                                icon={faRightFromBracket}
                                className="w-5 text-lg"
                            />
                            ログアウト
                        </button>
                    </form>
                </div>
            )}

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
        </aside>
    );
}
