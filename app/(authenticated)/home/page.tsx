import { getAbsences, getSchedules } from "@/src/shared/api";
import type { Absence, Schedule } from "@/src/shared/types/api";
import { AnalogClock } from "@/features/analog-clock";
import { WeatherWidget } from "@/features/weather";
import { ScheduleCard } from "@/features/schedule-card";
import { DateDisplay } from "@/features/date-display";

export default async function HomePage() {
  let absences: Absence[] = [];
  let schedules: Schedule[] = [];
  let error: string | null = null;

  try {
    const [absencesRes, schedulesRes] = await Promise.all([
      getAbsences(),
      getSchedules(),
    ]);
    absences = absencesRes.data || [];
    schedules = schedulesRes.data || [];
  } catch (err) {
    error = err instanceof Error ? err.message : "データの取得に失敗しました";
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
    todayDate,
  ).getTime();

  // 今日のスケジュールのEVENT_IDを取得
  const todayEventIds = schedules
    .filter((schedule) => {
      const values = Object.values(schedule);
      const year = Number(values[1]);
      const month = Number(values[2]);
      const date = Number(values[3]);
      return year === todayYear && month === todayMonth && date === todayDate;
    })
    .map((schedule) => String(Object.values(schedule)[0]));

  // 本日の欠席者をフィルタリング（今日のイベントに紐づく欠席者のみ）
  const todayAbsences = absences.filter((absence) => {
    const absenceEventId = String(Object.values(absence)[1]); // B列のEVENT_ID
    return todayEventIds.includes(absenceEventId);
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
        Number(valuesA[3]),
      ).getTime();
      const timestampB = new Date(
        Number(valuesB[1]),
        Number(valuesB[2]) - 1,
        Number(valuesB[3]),
      ).getTime();
      return timestampA - timestampB; // 日付順にソート
    });

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-full">
      <h1
        className="font-bold mb-8 max-lg:hidden"
        style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}
      >
        ダッシュボード
      </h1>
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Cards Grid - モバイル: スケジュール→欠席者→時計天気, デスクトップ: 2列グリッド */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Card - モバイル: 1番目, デスクトップ: 左上 */}
        <div className="card bg-base-100 shadow-xl border border-base-300 h-[420px] order-1">
          <div className="card-body pt-5 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-4 h-8 shrink-0">
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
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
                {upcomingSchedules.map((schedule: Schedule, index: number) => {
                  const values = Object.values(schedule);
                  const eventId = String(values[0] ?? ""); // A列 (EVENT_ID)
                  const year = Number(values[1]); // B列 (YYYY)
                  const month = Number(values[2]); // C列 (MM)
                  const date = Number(values[3]); // D列 (DD)
                  const rawTimeHH = values[4]; // E列 (TIME_HH)
                  const rawTimeMM = values[5]; // F列 (TIME_MM)
                  const title = String(values[6] ?? "予定"); // G列 (TITLE)
                  const where = String(values[7] ?? ""); // H列 (WHERE)
                  const detail = String(values[8] ?? ""); // I列 (DETAIL)

                  // 日付文字列を作成
                  const scheduleDate = new Date(year, month - 1, date);
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
                        rawTimeMM,
                      ).padStart(2, "0")}`
                    : undefined;

                  // このイベントの欠席者をフィルタリング
                  // absence_data シートの列構成: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名...
                  const eventAbsences = absences.filter((absence) => {
                    const absenceValues = Object.values(absence);
                    return absenceValues[1] === eventId; // B列のEVENT_IDで比較
                  });

                  return (
                    <ScheduleCard
                      key={index}
                      eventId={eventId}
                      title={title}
                      where={where}
                      detail={detail}
                      absences={eventAbsences}
                      dateLabel={dateLabel}
                      timeLabel={timeLabel}
                    />
                  );
                })}
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
                      fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
                    }}
                  >
                    予定はありません
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weather & Clock Combined Card - モバイル: 3番目, デスクトップ: 右上 */}
        <div className="card bg-base-100 shadow-xl border border-base-300 h-[420px] order-3 lg:order-2">
          <div className="card-body pt-5 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-2 h-8 shrink-0">
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
                  fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                }}
              >
                <DateDisplay />
              </h2>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-0 w-full min-h-0">
              <div className="flex items-center justify-center">
                <AnalogClock />
              </div>
              <div className="flex items-center justify-center">
                <WeatherWidget />
              </div>
            </div>
          </div>
        </div>

        {/* Absences Section - モバイル: 2番目, デスクトップ: 下段全幅 */}
        <div className="card bg-base-100 shadow-xl border border-base-300 order-2 lg:order-3 lg:col-span-2">
          <div className="card-body pt-5">
            <div className="flex items-center gap-2 mb-4 h-8">
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
                    fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
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
                    {todayAbsences.map((absence, index) => {
                      const values = Object.values(absence);
                      // A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
                      const studentNumber = String(values[2] ?? "");
                      const name = String(values[3] ?? "");
                      const type = String(values[4] ?? "");
                      const earlyLeaveTime = values[6]; // G: 早退時間
                      const leaveTime = values[7]; // H: 抜ける時間
                      const returnTime = values[8]; // I: 戻る時間

                      // ISO形式の時間をHH:MM（JST）に変換する関数
                      const formatTime = (time: unknown): string => {
                        if (!time || time === "") return "";
                        const timeStr = String(time);
                        // ISO形式（1899-12-30T03:13:00.000Z）の場合
                        if (timeStr.includes("T")) {
                          const date = new Date(timeStr);
                          // UTC → JST（+9時間）
                          const jstHours = (date.getUTCHours() + 9) % 24;
                          const hours = String(jstHours).padStart(2, "0");
                          const minutes = String(date.getUTCMinutes()).padStart(
                            2,
                            "0",
                          );
                          return `${hours}:${minutes}`;
                        }
                        return timeStr;
                      };

                      // 時間表示を作成
                      let timeDisplay = "";
                      if (type === "早退" && earlyLeaveTime) {
                        timeDisplay = formatTime(earlyLeaveTime);
                      } else if (type === "中抜け" && leaveTime && returnTime) {
                        timeDisplay = `${formatTime(leaveTime)} 〜 ${formatTime(
                          returnTime,
                        )}`;
                      }

                      return (
                        <tr key={index}>
                          <td>{studentNumber}</td>
                          <td>{name}</td>
                          <td>{type}</td>
                          <td>{timeDisplay}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="table table-zebra w-full"
                  style={{
                    fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
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
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center text-base-content/60"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-success"
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
                          本日の欠席者はいません
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
