"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBars,
    faBookOpen,
    faCircleInfo,
    faCircleQuestion,
    faListCheck,
    faRightFromBracket,
    faUser,
} from "@fortawesome/free-solid-svg-icons";
import packageJson from "@/package.json";
import { ProfileAvatar } from "@/features/profile-image";

interface User {
    name?: string | null;
    email?: string | null;
}

interface MoreClientProps {
    user: User | undefined;
    displayName?: string | null;
}

export default function MoreClient({ user, displayName }: MoreClientProps) {
    const resolvedDisplayName = displayName || user?.name || null;

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-3">
                    <FontAwesomeIcon
                        icon={faBars}
                        className="text-2xl text-primary"
                    />
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        その他
                    </h1>
                </div>

                <section className="card bg-base-200">
                    <div className="card-body">
                        <h2 className="card-title text-base">
                            <FontAwesomeIcon
                                icon={faCircleQuestion}
                                className="text-lg"
                            />
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
                                <FontAwesomeIcon
                                    icon={faBookOpen}
                                    className="text-lg"
                                />
                                ヘルプを見る
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="card bg-base-200">
                    <div className="card-body">
                        <h2 className="card-title text-base">
                            <FontAwesomeIcon
                                icon={faListCheck}
                                className="text-lg"
                            />
                            タスク管理
                        </h2>
                        <p className="text-sm text-base-content/60 mt-1">
                            担当者と進捗状況をまとめて確認できます
                        </p>
                        <div className="card-actions mt-3">
                            <Link
                                href="/tasks"
                                className="btn btn-primary btn-sm w-full gap-2"
                            >
                                <FontAwesomeIcon
                                    icon={faListCheck}
                                    className="text-lg"
                                />
                                タスクを開く
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="card bg-base-200">
                    <div className="card-body">
                        <h2 className="card-title text-base">
                            <FontAwesomeIcon
                                icon={faCircleInfo}
                                className="text-lg"
                            />
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

                {user && (
                    <section className="card bg-base-200">
                        <div className="card-body">
                            <h2 className="card-title text-base">
                                <FontAwesomeIcon
                                    icon={faUser}
                                    className="text-lg"
                                />
                                アカウント情報
                            </h2>
                            <div className="flex items-center gap-4 mt-2">
                                <ProfileAvatar
                                    name={resolvedDisplayName}
                                    size="md"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-base truncate">
                                        {resolvedDisplayName}
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
                                    <FontAwesomeIcon
                                        icon={faRightFromBracket}
                                        className="text-lg"
                                    />
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
