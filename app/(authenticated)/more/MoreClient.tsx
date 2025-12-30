"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import packageJson from "@/package.json";
import { ProfileAvatar } from "@/features/profile-image";

interface BusTime {
    hour: number;
    minutes: number[];
}

interface BusSchedule {
    stationName: string;
    fromStation: BusTime[];
    fromUniversity: BusTime[];
    notices: string[];
}

interface BusScheduleData {
    date: string;
    scheduleType: string;
    tobu: BusSchedule;
    jr: BusSchedule;
}

interface NextBus {
    hour: number;
    minute: number;
    remainingMinutes: number;
}

// 次のバスを計算
function getNextBus(times: BusTime[], now: Date): NextBus | null {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const allBuses: { hour: number; minute: number }[] = [];
    for (const time of times) {
        for (const minute of time.minutes) {
            allBuses.push({ hour: time.hour, minute });
        }
    }

    allBuses.sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.minute - b.minute;
    });

    for (const bus of allBuses) {
        if (bus.hour < currentHour) continue;
        if (bus.hour === currentHour && bus.minute <= currentMinute) continue;

        const remainingMinutes =
            (bus.hour - currentHour) * 60 + (bus.minute - currentMinute);

        return {
            hour: bus.hour,
            minute: bus.minute,
            remainingMinutes,
        };
    }

    return null;
}

// 時刻表示用フォーマット
function formatTime(hour: number, minute: number): string {
    return `${hour}:${String(minute).padStart(2, "0")}`;
}

interface User {
    name?: string | null;
    email?: string | null;
}

interface MoreClientProps {
    user: User | undefined;
}

export default function MoreClient({ user }: MoreClientProps) {
    const [busData, setBusData] = useState<BusScheduleData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const today = new Date().toISOString().split("T")[0];
                const res = await fetch(`/api/bus-schedule?date=${today}`);
                const json = await res.json();
                if (json.success) {
                    setBusData(json.data);
                } else {
                    setError(json.error || "データの取得に失敗しました");
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "データの取得に失敗しました"
                );
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // 30秒ごとに時刻を更新
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

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

                {/* バス時刻表セクション */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                            className="w-5 h-5 text-primary"
                            fill="currentColor"
                        >
                            <path d="M480 64C568.4 64 640 135.6 640 224L640 448C640 483.3 611.3 512 576 512L570.4 512C557.2 549.3 521.8 576 480 576C438.2 576 402.7 549.3 389.6 512L250.5 512C237.3 549.3 201.8 576 160.1 576C118.4 576 82.9 549.3 69.7 512L64 512C28.7 512 0 483.3 0 448L0 160C0 107 43 64 96 64L480 64zM160 432C133.5 432 112 453.5 112 480C112 506.5 133.5 528 160 528C186.5 528 208 506.5 208 480C208 453.5 186.5 432 160 432zM480 432C453.5 432 432 453.5 432 480C432 506.5 453.5 528 480 528C506.5 528 528 506.5 528 480C528 453.5 506.5 432 480 432zM480 128C462.3 128 448 142.3 448 160L448 352C448 369.7 462.3 384 480 384L544 384C561.7 384 576 369.7 576 352L576 224C576 171 533 128 480 128zM248 288L352 288C369.7 288 384 273.7 384 256L384 160C384 142.3 369.7 128 352 128L248 128L248 288zM96 128C78.3 128 64 142.3 64 160L64 256C64 273.7 78.3 288 96 288L200 288L200 128L96 128z" />
                        </svg>
                        簡易バスダイヤ
                    </h2>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : error ? (
                        <div className="alert alert-error">
                            <span>{error}</span>
                        </div>
                    ) : busData ? (
                        <>
                            {/* 東武動物公園駅 */}
                            <div className="card bg-base-100 shadow-sm border border-orange-500/30">
                                <div className="card-body p-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-orange-500/10">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-6 w-6 text-orange-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7h8m-8 4h8m-4-8v16m-4-4h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-lg">
                                            東武動物公園駅
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-orange-500/10">
                                            <div className="text-sm text-base-content/70 mb-2">
                                                次の駅発バス
                                            </div>
                                            {(() => {
                                                const next = getNextBus(
                                                    busData.tobu.fromStation,
                                                    now
                                                );
                                                return next ? (
                                                    <>
                                                        <div className="font-bold text-2xl">
                                                            {formatTime(
                                                                next.hour,
                                                                next.minute
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-orange-500">
                                                            あと
                                                            {
                                                                next.remainingMinutes
                                                            }
                                                            分
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-base-content/50">
                                                        本日終了
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="p-4 rounded-xl bg-orange-500/10">
                                            <div className="text-sm text-base-content/70 mb-2">
                                                次の大学発バス
                                            </div>
                                            {(() => {
                                                const next = getNextBus(
                                                    busData.tobu.fromUniversity,
                                                    now
                                                );
                                                return next ? (
                                                    <>
                                                        <div className="font-bold text-2xl">
                                                            {formatTime(
                                                                next.hour,
                                                                next.minute
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-orange-500">
                                                            あと
                                                            {
                                                                next.remainingMinutes
                                                            }
                                                            分
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-base-content/50">
                                                        本日終了
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* JR新白岡駅 */}
                            <div className="card bg-base-100 shadow-sm border border-blue-500/30">
                                <div className="card-body p-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-blue-500/10">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-6 w-6 text-blue-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7h8m-8 4h8m-4-8v16m-4-4h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-lg">
                                            JR新白岡駅
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-blue-500/10">
                                            <div className="text-sm text-base-content/70 mb-2">
                                                次の駅発バス
                                            </div>
                                            {(() => {
                                                const next = getNextBus(
                                                    busData.jr.fromStation,
                                                    now
                                                );
                                                return next ? (
                                                    <>
                                                        <div className="font-bold text-2xl">
                                                            {formatTime(
                                                                next.hour,
                                                                next.minute
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-blue-500">
                                                            あと
                                                            {
                                                                next.remainingMinutes
                                                            }
                                                            分
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-base-content/50">
                                                        本日終了
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="p-4 rounded-xl bg-blue-500/10">
                                            <div className="text-sm text-base-content/70 mb-2">
                                                次の大学発バス
                                            </div>
                                            {(() => {
                                                const next = getNextBus(
                                                    busData.jr.fromUniversity,
                                                    now
                                                );
                                                return next ? (
                                                    <>
                                                        <div className="font-bold text-2xl">
                                                            {formatTime(
                                                                next.hour,
                                                                next.minute
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-blue-500">
                                                            あと
                                                            {
                                                                next.remainingMinutes
                                                            }
                                                            分
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-base-content/50">
                                                        本日終了
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <Link
                                    href="/bus"
                                    className="btn btn-outline btn-sm gap-2"
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
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    時刻表を見る
                                </Link>
                            </div>
                        </>
                    ) : null}
                </section>

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
