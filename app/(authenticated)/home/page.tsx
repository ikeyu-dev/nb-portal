import { getDashboardDataServer } from "@/src/shared/api/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faClock,
    faHouse,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { faCircleCheck } from "@fortawesome/free-regular-svg-icons";
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
import { MobilePWAInstallBanner } from "@/src/features/pwa-install";
import { auth } from "@/src/auth";
import { formatJstDateInput, parseDateInput } from "@/src/shared/lib/jst-date";

const getScheduleAttendanceMode = (
    schedule: Schedule
): ScheduleAttendanceMode =>
    normalizeScheduleAttendanceMode(
        schedule.ATTENDANCE_MODE ?? schedule.attendanceMode
    );

const getScheduleValue = (
    schedule: Schedule,
    key: string,
    fallbackIndex: number
) => schedule[key] ?? Object.values(schedule)[fallbackIndex] ?? "";

const getAbsenceValue = (
    absence: Absence,
    key: string,
    fallbackIndex: number
) => absence[key] ?? Object.values(absence)[fallbackIndex] ?? "";

const buildDateInput = (
    yearValue: unknown,
    monthValue: unknown,
    dateValue: unknown
) => {
    const year = String(yearValue ?? "").trim();
    const month = String(monthValue ?? "").trim();
    const date = String(dateValue ?? "").trim();
    if (!year || !month || !date) return "";

    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${date.padStart(
        2,
        "0"
    )}`;
};

const getScheduleEventId = (schedule: Schedule) =>
    String(getScheduleValue(schedule, "EVENT_ID", 0));

const getScheduleStartDateInput = (schedule: Schedule) =>
    buildDateInput(
        getScheduleValue(schedule, "YYYY", 1),
        getScheduleValue(schedule, "MM", 2),
        getScheduleValue(schedule, "DD", 3)
    );

const getScheduleEndDateInput = (schedule: Schedule) =>
    buildDateInput(
        getScheduleValue(schedule, "END_YYYY", 9),
        getScheduleValue(schedule, "END_MM", 10),
        getScheduleValue(schedule, "END_DD", 11)
    );

const getScheduleEndOrStartDateInput = (schedule: Schedule) =>
    getScheduleEndDateInput(schedule) || getScheduleStartDateInput(schedule);

const isScheduleActiveOnDate = (schedule: Schedule, dateInput: string) => {
    const startDate = getScheduleStartDateInput(schedule);
    const endDate = getScheduleEndOrStartDateInput(schedule);
    if (!startDate || !endDate) return false;

    return startDate <= dateInput && dateInput <= endDate;
};

const isScheduleUpcomingOnDate = (schedule: Schedule, dateInput: string) => {
    const endDate = getScheduleEndOrStartDateInput(schedule);
    if (!endDate) return false;

    return endDate >= dateInput;
};

const getScheduleStartTimestamp = (schedule: Schedule) => {
    const date = parseDateInput(getScheduleStartDateInput(schedule));
    return date?.getTime() ?? Number.MAX_SAFE_INTEGER;
};

const getAbsenceEventId = (absence: Absence) =>
    String(getAbsenceValue(absence, "EVENT_ID", 1));

const getAbsenceType = (absence: Absence) =>
    String(getAbsenceValue(absence, "TYPE", 4));

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

    const todayDateInput = formatJstDateInput();

    const todayEventIds = new Set(
        schedules
            .filter((schedule) =>
                isScheduleActiveOnDate(schedule, todayDateInput)
            )
            .map(getScheduleEventId)
    );

    // 本日の欠席者をフィルタリング（出席申告は除外）
    const todayAbsences = absences.filter((absence) => {
        const absenceEventId = getAbsenceEventId(absence);
        const type = getAbsenceType(absence);
        return todayEventIds.has(absenceEventId) && type !== "出席";
    });

    const upcomingSchedules = schedules
        .filter((schedule) => isScheduleUpcomingOnDate(schedule, todayDateInput))
        .sort(
            (a, b) =>
                getScheduleStartTimestamp(a) - getScheduleStartTimestamp(b)
        );

    return (
        <>
            <ProfileImageSaver profileImage={session?.profileImage} />
            <div className="max-w-full p-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
                <div className="mb-5 flex items-center gap-3 max-lg:hidden shrink-0 lg:mb-6">
                    <FontAwesomeIcon
                        icon={faHouse}
                        className="text-2xl text-primary"
                    />
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

                <MobilePWAInstallBanner />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="card bg-base-100 shadow-xl border border-base-300 order-3 lg:order-3 lg:col-span-6">
                        <div className="card-body flex flex-col p-5 pb-4">
                            <div className="mb-3 flex h-8 items-center gap-2 shrink-0">
                                <FontAwesomeIcon
                                    icon={faCalendarDays}
                                    className="text-xl text-primary"
                                />
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
                                        (schedule: Schedule) => {
                                            const eventId = String(
                                                getScheduleEventId(schedule)
                                            );
                                            const year = Number(
                                                getScheduleValue(
                                                    schedule,
                                                    "YYYY",
                                                    1
                                                )
                                            );
                                            const month = Number(
                                                getScheduleValue(
                                                    schedule,
                                                    "MM",
                                                    2
                                                )
                                            );
                                            const date = Number(
                                                getScheduleValue(
                                                    schedule,
                                                    "DD",
                                                    3
                                                )
                                            );
                                            const rawTimeHH = getScheduleValue(
                                                schedule,
                                                "TIME_HH",
                                                4
                                            );
                                            const rawTimeMM = getScheduleValue(
                                                schedule,
                                                "TIME_MM",
                                                5
                                            );
                                            const rawEndTimeHH =
                                                getScheduleValue(
                                                    schedule,
                                                    "END_TIME_HH",
                                                    18
                                                );
                                            const rawEndTimeMM =
                                                getScheduleValue(
                                                    schedule,
                                                    "END_TIME_MM",
                                                    19
                                                );
                                            const rawEndYear = getScheduleValue(
                                                schedule,
                                                "END_YYYY",
                                                9
                                            );
                                            const rawEndMonth =
                                                getScheduleValue(
                                                    schedule,
                                                    "END_MM",
                                                    10
                                                );
                                            const rawEndDate = getScheduleValue(
                                                schedule,
                                                "END_DD",
                                                11
                                            );
                                            const title = String(
                                                getScheduleValue(
                                                    schedule,
                                                    "TITLE",
                                                    6
                                                ) || "予定"
                                            );
                                            const where = String(
                                                getScheduleValue(
                                                    schedule,
                                                    "WHERE",
                                                    7
                                                )
                                            );
                                            const detail = String(
                                                getScheduleValue(
                                                    schedule,
                                                    "DETAIL",
                                                    8
                                                )
                                            );
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
                                            const startDateInput = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
                                            const endDateInput =
                                                rawEndYear &&
                                                rawEndMonth &&
                                                rawEndDate
                                                    ? `${String(rawEndYear).padStart(4, "0")}-${String(rawEndMonth).padStart(2, "0")}-${String(rawEndDate).padStart(2, "0")}`
                                                    : undefined;

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
                                                    key={eventId}
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
                                                    startDate={startDateInput}
                                                    endDate={endDateInput}
                                                    startTime={timeLabel}
                                                    endTime={endTimeLabel}
                                                    attendanceDeadline={String(
                                                        schedule.ATTENDANCE_DEADLINE ??
                                                            ""
                                                    )}
                                                />
                                            );
                                        }
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center text-base-content/60">
                                        <FontAwesomeIcon
                                            icon={faCircleCheck}
                                            className="mx-auto mb-3 block text-6xl opacity-50"
                                        />
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
                                <FontAwesomeIcon
                                    icon={faClock}
                                    className="text-xl text-primary"
                                />
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
                                <FontAwesomeIcon
                                    icon={faUsers}
                                    className="text-xl text-primary"
                                />
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
                                        <FontAwesomeIcon
                                            icon={faCircleCheck}
                                            className="mx-auto mb-3 block text-6xl opacity-50"
                                        />
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
