import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/features/theme-toggle";
import { auth, signOut } from "@/src/auth";

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
                            className="w-auto h-auto max-w-full"
                        />
                    </div>
                    {/* Menu */}
                    <ul
                        className="menu p-4 flex-1 w-full"
                        style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}
                    >
                        <li>
                            <Link href="/home">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 640 640"
                                    className="size-5"
                                    fill="currentColor"
                                >
                                    <path d="M304 70.1C313.1 61.9 326.9 61.9 336 70.1L568 278.1C577.9 286.9 578.7 302.1 569.8 312C560.9 321.9 545.8 322.7 535.9 313.8L527.9 306.6L527.9 511.9C527.9 547.2 499.2 575.9 463.9 575.9L175.9 575.9C140.6 575.9 111.9 547.2 111.9 511.9L111.9 306.6L103.9 313.8C94 322.6 78.9 321.8 70 312C61.1 302.2 62 287 71.8 278.1L304 70.1zM320 120.2L160 263.7L160 512C160 520.8 167.2 528 176 528L224 528L224 424C224 384.2 256.2 352 296 352L344 352C383.8 352 416 384.2 416 424L416 528L464 528C472.8 528 480 520.8 480 512L480 263.7L320 120.3zM272 528L368 528L368 424C368 410.7 357.3 400 344 400L296 400C282.7 400 272 410.7 272 424L272 528z" />
                                </svg>
                                ホーム
                            </Link>
                        </li>
                        <li>
                            <Link href="/calendar">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 640 640"
                                    className="size-5"
                                    fill="currentColor"
                                >
                                    <path d="M216 64C229.3 64 240 74.7 240 88L240 128L400 128L400 88C400 74.7 410.7 64 424 64C437.3 64 448 74.7 448 88L448 128L480 128C515.3 128 544 156.7 544 192L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 192C96 156.7 124.7 128 160 128L192 128L192 88C192 74.7 202.7 64 216 64zM216 176L160 176C151.2 176 144 183.2 144 192L144 240L496 240L496 192C496 183.2 488.8 176 480 176L216 176zM144 288L144 480C144 488.8 151.2 496 160 496L480 496C488.8 496 496 488.8 496 480L496 288L144 288z" />
                                </svg>
                                カレンダー
                            </Link>
                        </li>
                        <li>
                            <Link href="/items">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 640 640"
                                    className="size-5"
                                    fill="currentColor"
                                >
                                    <path d="M320 64C267 64 224 107 224 160L224 288C224 341 267 384 320 384C373 384 416 341 416 288L416 160C416 107 373 64 320 64zM176 248C176 234.7 165.3 224 152 224C138.7 224 128 234.7 128 248L128 288C128 385.9 201.3 466.7 296 478.5L296 528L248 528C234.7 528 224 538.7 224 552C224 565.3 234.7 576 248 576L392 576C405.3 576 416 565.3 416 552C416 538.7 405.3 528 392 528L344 528L344 478.5C438.7 466.7 512 385.9 512 288L512 248C512 234.7 501.3 224 488 224C474.7 224 464 234.7 464 248L464 288C464 367.5 399.5 432 320 432C240.5 432 176 367.5 176 288L176 248z" />
                                </svg>
                                機材一覧
                            </Link>
                        </li>
                        <li>
                            <Link href="/notifications">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 640 640"
                                    className="size-5"
                                    fill="currentColor"
                                >
                                    <path d="M240 80c0-26.5 21.5-48 48-48l64 0c26.5 0 48 21.5 48 48l0 13.7c68.4 21.7 118 86.5 118 163.3l0 115c0 12.7 5.1 24.9 14.1 33.9l24 24c9.4 9.4 14.1 21.7 14.1 34c0 26.5-21.5 48-48 48L117.8 512c-26.5 0-48-21.5-48-48c0-12.7 5.1-24.9 14.1-33.9l24-24c9-9 14.1-21.2 14.1-33.9L122 257c0-76.7 49.6-141.6 118-163.3L240 80zm48 352l64 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-64 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
                                </svg>
                                お知らせ
                            </Link>
                        </li>
                    </ul>

                    {/* Theme Toggle */}
                    <div className="p-4 border-t border-base-300">
                        <ThemeToggle showLabel={true} />
                    </div>

                    {/* User Info & Logout */}
                    {session?.user && (
                        <div className="p-4 border-t border-base-300">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="avatar placeholder">
                                    <div className="bg-primary text-primary-content rounded-full w-10 flex items-center justify-center">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 448 512"
                                            className="w-5 h-5"
                                            fill="currentColor"
                                        >
                                            <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z" />
                                        </svg>
                                    </div>
                                </div>
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
                            <form
                                action={async () => {
                                    "use server";
                                    await signOut({ redirectTo: "/login" });
                                }}
                            >
                                <button
                                    type="submit"
                                    className="btn btn-ghost btn-sm w-full justify-start gap-2"
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
                </div>
            </div>
        </div>
    );
}
