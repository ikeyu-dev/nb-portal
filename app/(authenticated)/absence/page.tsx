import { Suspense } from "react";
import { auth } from "@/src/auth";
import { AbsenceFormContent } from "./AbsenceFormContent";
import { getSchedulesServer } from "@/src/shared/api/server";
import { normalizeScheduleAttendanceMode } from "@/src/shared/types/api";

export default async function AbsencePage({ searchParams }: {
    searchParams: Promise<{ eventId?: string; mode?: string }>;
}) {
    const session = await auth();
    const studentId = session?.studentId || null;
    const memberName = session?.displayName || session?.memberName || null;
    const { eventId } = await searchParams;
    let resolvedAttendanceMode;
    if (eventId) {
        const result = await getSchedulesServer();
        if (!result.success) {
            return <div className="p-4" role="alert">予定を取得できませんでした。再読み込みしてください。</div>;
        }
        const schedule = result.data?.find((item) => String(item.EVENT_ID ?? item.eventId) === eventId);
        if (!schedule) return <div className="p-4">予定が見つかりません。</div>;
        resolvedAttendanceMode = normalizeScheduleAttendanceMode(schedule.ATTENDANCE_MODE ?? schedule.attendanceMode);
    }

    return (
        <Suspense
            fallback={
                <div className="p-4 sm:p-6 max-w-4xl mx-auto">
                    <h1
                        className="font-bold mb-6 max-lg:hidden"
                        style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}
                    >
                        欠席連絡
                    </h1>
                    <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="card-body">
                            <div className="flex justify-center">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <AbsenceFormContent
                studentId={studentId}
                memberName={memberName}
                resolvedAttendanceMode={resolvedAttendanceMode}
            />
        </Suspense>
    );
}
