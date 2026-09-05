import { getCalendarDataServer } from "@/src/shared/api/server";
import { unstable_rethrow } from "next/navigation";
import CalendarClient, { type CalendarInitialData } from "./CalendarClient";

export default async function CalendarPage() {
    let initialData: CalendarInitialData | null = null;

    try {
        const { schedules, absences } = await getCalendarDataServer();
        if (schedules.success) {
            initialData = {
                schedules: schedules.data || [],
                absences: absences.success ? absences.data || [] : [],
            };
        }
    } catch (error) {
        unstable_rethrow(error);
        console.error("Calendar initial data fetch failed:", error);
    }

    return <CalendarClient initialData={initialData} />;
}
