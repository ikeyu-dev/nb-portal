type AttendanceResponseWindow = {
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    deadlineDate?: string | null;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ATTENDANCE_DEADLINE_TIME = "08:00";

export const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const getDefaultAttendanceDeadline = (startDate: string) =>
    DATE_PATTERN.test(startDate) ? startDate : "";

const jstDateTime = (date: string, time: string) =>
    new Date(`${date}T${time}:00+09:00`);

export const getAttendanceResponseWindow = ({
    startDate,
    deadlineDate,
}: AttendanceResponseWindow) => {
    const normalizedStartDate = String(startDate ?? "");
    if (!DATE_PATTERN.test(normalizedStartDate)) return null;

    const normalizedDeadlineDate = DATE_PATTERN.test(String(deadlineDate ?? ""))
        ? String(deadlineDate)
        : getDefaultAttendanceDeadline(normalizedStartDate);

    return {
        deadlineEnd: jstDateTime(
            normalizedDeadlineDate,
            ATTENDANCE_DEADLINE_TIME
        ),
        deadlineDate: normalizedDeadlineDate,
    };
};

export const isAttendanceResponseAllowed = (
    windowInput: AttendanceResponseWindow,
    now = new Date()
) => {
    const window = getAttendanceResponseWindow(windowInput);
    if (!window) return true;

    return now < window.deadlineEnd;
};

export const getAttendanceDeadlineLabel = (
    windowInput: AttendanceResponseWindow
) => {
    const window = getAttendanceResponseWindow(windowInput);
    if (!window) return "";

    return `${window.deadlineDate.replaceAll("-", "/")} ${ATTENDANCE_DEADLINE_TIME}`;
};
