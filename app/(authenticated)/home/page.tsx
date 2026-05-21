import { getDashboardDataServer } from "@/src/shared/api/server";
import type {
    Absence,
    NextMeetingSettings,
    Schedule,
    ScheduleAttendanceMode,
} from "@/src/shared/types/api";
import { normalizeScheduleAttendanceMode } from "@/src/shared/types/api";
import { DigitalClock } from "@/features/digital-clock";
import { WeatherWidget } from "@/features/weather";
import { ScheduleCard } from "@/features/schedule-card";
import { DateDisplay } from "@/features/date-display";
import { ProfileImageSaver } from "@/features/profile-image";
import { NextMeetingCard } from "@/src/features/next-meeting";
import { auth } from "@/src/auth";

const getScheduleAttendanceMode = (
    schedule: Schedule
): ScheduleAttendanceMode =>
    normalizeScheduleAttendanceMode(
        schedule.ATTENDANCE_MODE ?? schedule.attendanceMode
    );

export default async function HomePage() {
    const session = await auth();

    let absences: Absence[] = [];
    let schedules: Schedule[] = [];
    let nextMeeting: NextMeetingSettings | null = null;
    let error: string | null = null;

    try {
        const dashboardRes = await getDashboardDataServer();
        absences = dashboardRes.data?.absences || [];
        schedules = dashboardRes.data?.schedules || [];
        nextMeeting = dashboardRes.data?.nextMeeting || null;
    } catch (err) {
        error =
            err instanceof Error ? err.message : "データの取得に失敗しました";
    }

    // 今日の日付を取得（スケジュールフィルタ用）
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    // 今後のスケジュールをフィルタリング（今日以降）
    // スプレッドシートの形式: A=EVENT_ID, B=YYYY, C=MM, D=DD, E=TITLE, F=WHERE, G=DETAIL
    const todayTimestamp = new Date(
        todayYear,
        todayMonth - 1,
        todayDate
    ).getTime();

    // 今日のスケジュールのEVENT_IDを取得
    const todayEventIds = schedules
        .filter((schedule) => {
            const values = Object.values(schedule);
            const year = Number(values[1]);
            const month = Number(values[2]);
            const date = Number(values[3]);
            return (
                year === todayYear && month === todayMonth && date === todayDate
            );
        })
        .map((schedule) => String(Object.values(schedule)[0]));

    // 本日の欠席者をフィルタリング（出席申告は除外）
    const todayAbsences = absences.filter((absence) => {
        const values = Object.values(absence);
        const absenceEventId = String(values[1]); // B列のEVENT_ID
        const type = String(values[4] ?? ""); // E列の種別
        return todayEventIds.includes(absenceEventId) && type !== "出席";
    });

    const upcomingSchedules = schedules
        .filter((schedule) => {
            const values = Object.values(schedule);
            const year = Number(values[1]);
            const month = Number(values[2]);
            const date = Number(values[3]);
            const scheduleTimestamp = new Date(year, month - 1, date).getTime();
            // 今日以降のスケジュールのみ
            return scheduleTimestamp >= todayTimestamp;
        })
        .sort((a, b) => {
            const valuesA = Object.values(a);
            const valuesB = Object.values(b);
            const timestampA = new Date(
                Number(valuesA[1]),
                Number(valuesA[2]) - 1,
                Number(valuesA[3])
            ).getTime();
            const timestampB = new Date(
                Number(valuesB[1]),
                Number(valuesB[2]) - 1,
                Number(valuesB[3])
            ).getTime();
            return timestampA - timestampB; // 日付順にソート
        });

    return (
        <>
            <ProfileImageSaver profileImage={session?.profileImage} />
            <div className="max-w-full p-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
                <div className="mb-5 flex items-center gap-3 max-lg:hidden shrink-0 lg:mb-6">
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
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                    </svg>
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        ダッシュボード
                    </h1>
                </div>
                {error && (
                    <div className="alert alert-error mb-5">
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="card bg-base-100 shadow-xl border border-base-300 order-3 lg:order-3 lg:col-span-6">
                        <div className="card-body flex flex-col p-5 pb-4">
                            <div className="mb-3 flex h-8 items-center gap-2 shrink-0">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-primary"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                                <h2
                                    className="card-title"
                                    style={{
                                        fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                                    }}
                                >
                                    今後のスケジュール
                                </h2>
                                {upcomingSchedules.length > 0 && (
                                    <span className="badge badge-primary badge-sm ml-auto">
                                        {upcomingSchedules.length}
                                    </span>
                                )}
                            </div>
                            {upcomingSchedules.length > 0 ? (
                                <div className="overflow-hidden rounded-xl bg-base-100 ring-1 ring-base-300/70 divide-y divide-base-300/70">
                                    {upcomingSchedules.map(
                                        (schedule: Schedule, index: number) => {
                                            const values =
                                                Object.values(schedule);
                                            const eventId = String(
                                                values[0] ?? ""
                                            ); // A列 (EVENT_ID)
                                            const year = Number(values[1]); // B列 (YYYY)
                                            const month = Number(values[2]); // C列 (MM)
                                            const date = Number(values[3]); // D列 (DD)
                                            const rawTimeHH = values[4]; // E列 (TIME_HH)
                                            const rawTimeMM = values[5]; // F列 (TIME_MM)
                                            const rawEndTimeHH = values[18]; // S列 (END_TIME_HH)
                                            const rawEndTimeMM = values[19]; // T列 (END_TIME_MM)
                                            const title = String(
                                                values[6] ?? "予定"
                                            ); // G列 (TITLE)
                                            const where = String(
                                                values[7] ?? ""
                                            ); // H列 (WHERE)
                                            const detail = String(
                                                values[8] ?? ""
                                            ); // I列 (DETAIL)
                                            const attendanceMode =
                                                getScheduleAttendanceMode(
                                                    schedule
                                                );

                                            // 日付文字列を作成
                                            const scheduleDate = new Date(
                                                year,
                                                month - 1,
                                                date
                                            );
                                            const scheduleDayOfWeek = [
                                                "日",
                                                "月",
                                                "火",
                                                "水",
                                                "木",
                                                "金",
                                                "土",
                                            ][scheduleDate.getDay()];
                                            const dateLabel = `${month}/${date}(${scheduleDayOfWeek})`;

                                            // 時刻ラベルを作成（値が存在する場合のみ）
                                            const hasTime =
                                                rawTimeHH !== "" &&
                                                rawTimeHH !== null &&
                                                rawTimeHH !== undefined &&
                                                rawTimeMM !== "" &&
                                                rawTimeMM !== null &&
                                                rawTimeMM !== undefined;
                                            const timeLabel = hasTime
                                                ? `${String(rawTimeHH).padStart(2, "0")}:${String(
                                                      rawTimeMM
                                                  ).padStart(2, "0")}`
                                                : undefined;
                                            const hasEndTime =
                                                rawEndTimeHH !== "" &&
                                                rawEndTimeHH !== null &&
                                                rawEndTimeHH !== undefined &&
                                                rawEndTimeMM !== "" &&
                                                rawEndTimeMM !== null &&
                                                rawEndTimeMM !== undefined;
                                            const endTimeLabel = hasEndTime
                                                ? `${String(rawEndTimeHH).padStart(2, "0")}:${String(
                                                      rawEndTimeMM
                                                  ).padStart(2, "0")}`
                                                : undefined;
                                            const timeRangeLabel =
                                                timeLabel && endTimeLabel
                                                    ? `${timeLabel}-${endTimeLabel}`
                                                    : timeLabel;

                                            // このイベントの欠席者をフィルタリング
                                            // absence_data シートの列構成: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名...
                                            const eventAbsences =
                                                absences.filter((absence) => {
                                                    const absenceValues =
                                                        Object.values(absence);
                                                    return (
                                                        absenceValues[1] ===
                                                        eventId
                                                    ); // B列のEVENT_IDで比較
                                                });

                                            return (
                                                <ScheduleCard
                                                    key={index}
                                                    eventId={eventId}
                                                    title={title}
                                                    where={where}
                                                    detail={detail}
                                                    absences={eventAbsences}
                                                    attendanceMode={
                                                        attendanceMode
                                                    }
                                                    currentStudentNumber={
                                                        session?.studentId
                                                    }
                                                    currentDisplayName={
                                                        session?.displayName ||
                                                        session?.memberName
                                                    }
                                                    dateLabel={dateLabel}
                                                    timeLabel={timeRangeLabel}
                                                />
                                            );
                                        }
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center text-base-content/60">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-16 w-16 mx-auto mb-3 opacity-50"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <p
                                            style={{
                                                fontSize:
                                                    "clamp(0.875rem, 2vw, 1.125rem)",
                                            }}
                                        >
                                            予定はありません
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl border border-base-300 order-1 lg:order-1 lg:col-span-12">
                        <div className="card-body p-4">
                            <div className="flex h-7 items-center gap-2 shrink-0">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-primary"
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
                                <h2
                                    className="card-title"
                                    style={{
                                        fontSize:
                                            "clamp(1rem, 2.5vw, 1.25rem)",
                                    }}
                                >
                                    <DateDisplay />
                                </h2>
                            </div>
                            <div className="flex flex-col items-center gap-1 pt-1 text-center">
                                <DigitalClock
                                    memberName={session?.memberName}
                                />
                                <WeatherWidget />
                            </div>
                        </div>
                    </div>

                    <NextMeetingCard
                        initialMeeting={nextMeeting}
                        permission={session?.permission}
                        className="order-2 lg:order-2 lg:col-span-12"
                    />

                    <div className="card bg-base-100 shadow-xl border border-base-300 order-4 overflow-hidden lg:order-4 lg:col-span-6">
                        <div className="card-body flex flex-col p-5 pb-4">
                            <div className="mb-3 flex h-8 items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-primary"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                                <h2
                                    className="card-title"
                                    style={{
                                        fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                                    }}
                                >
                                    本日の欠席者
                                </h2>
                            </div>
                            {todayAbsences.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table
                                        className="table table-zebra w-full"
                                        style={{
                                            fontSize:
                                                "clamp(0.875rem, 2vw, 1.125rem)",
                                        }}
                                    >
                                        <thead>
                                            <tr>
                                                <th>学籍番号</th>
                                                <th>氏名</th>
                                                <th>種別</th>
                                                <th>時間</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {todayAbsences.map(
                                                (absence, index) => {
                                                    const values =
                                                        Object.values(absence);
                                                    // A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
                                                    const studentNumber =
                                                        String(values[2] ?? "");
                                                    const name = String(
                                                        values[3] ?? ""
                                                    );
                                                    const type = String(
                                                        values[4] ?? ""
                                                    );
                                                    const earlyLeaveTime =
                                                        values[6]; // G: 早退時間
                                                    const leaveTime = values[7]; // H: 抜ける時間
                                                    const returnTime =
                                                        values[8]; // I: 戻る時間

                                                    // ISO形式の時間をHH:MM（JST）に変換する関数
                                                    const formatTime = (
                                                        time: unknown
                                                    ): string => {
                                                        if (
                                                            !time ||
                                                            time === ""
                                                        )
                                                            return "";
                                                        const timeStr =
                                                            String(time);
                                                        // ISO形式（1899-12-30T03:13:00.000Z）の場合
                                                        if (
                                                            timeStr.includes(
                                                                "T"
                                                            )
                                                        ) {
                                                            const date =
                                                                new Date(
                                                                    timeStr
                                                                );
                                                            // UTC → JST（+9時間）
                                                            const jstHours =
                                                                (date.getUTCHours() +
                                                                    9) %
                                                                24;
                                                            const hours =
                                                                String(
                                                                    jstHours
                                                                ).padStart(
                                                                    2,
                                                                    "0"
                                                                );
                                                            const minutes =
                                                                String(
                                                                    date.getUTCMinutes()
                                                                ).padStart(
                                                                    2,
                                                                    "0"
                                                                );
                                                            return `${hours}:${minutes}`;
                                                        }
                                                        return timeStr;
                                                    };

                                                    // 時間表示を作成
                                                    let timeDisplay = "";
                                                    if (
                                                        type === "早退" &&
                                                        earlyLeaveTime
                                                    ) {
                                                        timeDisplay =
                                                            formatTime(
                                                                earlyLeaveTime
                                                            );
                                                    } else if (
                                                        type === "中抜け" &&
                                                        leaveTime &&
                                                        returnTime
                                                    ) {
                                                        timeDisplay = `${formatTime(leaveTime)} 〜 ${formatTime(
                                                            returnTime
                                                        )}`;
                                                    }

                                                    return (
                                                        <tr key={index}>
                                                            <td>
                                                                {studentNumber}
                                                            </td>
                                                            <td>{name}</td>
                                                            <td>{type}</td>
                                                            <td>
                                                                {timeDisplay}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center text-base-content/60">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-16 w-16 mx-auto mb-3 opacity-50"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <p
                                            style={{
                                                fontSize:
                                                    "clamp(0.875rem, 2vw, 1.125rem)",
                                            }}
                                        >
                                            本日の欠席者はいません
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
