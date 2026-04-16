"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import packageJson from "@/package.json";
import { ProfileAvatar } from "@/features/profile-image";

interface User {
    name?: string | null;
    email?: string | null;
}

interface MoreClientProps {
    user: User | undefined;
}

export default function MoreClient({ user }: MoreClientProps) {
    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* ヘッダー */}
                <div className="flex items-center gap-3">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        その他
                    </h1>
                </div>

                {/* ヘルプセクション */}
                <section className="card bg-base-200">
                    <div className="card-body">
                        <h2 className="card-title text-base">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            ヘルプ
                        </h2>
                        <p className="text-sm text-base-content/60 mt-1">
                            各機能の使い方やデモを確認できます
                        </p>
                        <div className="card-actions mt-3">
                            <Link
                                href="/help"
                                className="btn btn-primary btn-sm w-full gap-2"
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
                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                </svg>
                                ヘルプを見る
                            </Link>
                        </div>
                    </div>
                </section>

                {/* バージョン情報セクション */}
                <section className="card bg-base-200">
                    <div className="card-body">
                        <h2 className="card-title text-base">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            アプリ情報
                        </h2>
                        <div className="mt-2 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-base-content/60">
                                    アプリ名
                                </span>
                                <span className="font-medium">NB Portal</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-base-content/60">
                                    バージョン
                                </span>
                                <span className="font-mono font-medium">
                                    v{packageJson.version}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* アカウント情報セクション */}
                {user && (
                    <section className="card bg-base-200">
                        <div className="card-body">
                            <h2 className="card-title text-base">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 448 512"
                                    className="w-5 h-5"
                                    fill="currentColor"
                                >
                                    <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z" />
                                </svg>
                                アカウント情報
                            </h2>
                            <div className="flex items-center gap-4 mt-2">
                                <ProfileAvatar
                                    name={user.name}
                                    size="md"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-base truncate">
                                        {user.name}
                                    </p>
                                    <p className="text-sm text-base-content/60 truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                            <div className="card-actions mt-4">
                                <button
                                    onClick={() =>
                                        signOut({ callbackUrl: "/login" })
                                    }
                                    className="btn btn-error btn-outline btn-sm w-full gap-2"
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
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
