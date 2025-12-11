import { getSchedules } from "@/src/shared/api";
import type { Schedule } from "@/src/shared/types/api";

export default async function CalendarPage() {
    let schedules: Schedule[] = [];
    let error: string | null = null;

    try {
        const schedulesRes = await getSchedules();
        schedules = schedulesRes.data || [];
    } catch (err) {
        error = err instanceof Error ? err.message : "データの取得に失敗しました";
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 max-lg:hidden">カレンダー</h1>
                {error && (
                    <div className="alert alert-error mb-6">
                        <span>{error}</span>
                    </div>
                )}

                {/* スケジュール一覧 */}
                <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 max-lg:hidden">スケジュール</h2>
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                {schedules.length > 0 &&
                                    Object.keys(schedules[0]).map((key) => (
                                        <th key={key}>{key}</th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.map((schedule, index) => (
                                <tr key={index}>
                                    {Object.values(schedule).map((value, i) => (
                                        <td key={i}>{String(value)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {schedules.length === 0 && !error && (
                        <p className="text-center py-8 text-base-content/60">
                            スケジュールがありません
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
