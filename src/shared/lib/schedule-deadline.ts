type AttendanceResponseWindow = {
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    deadlineDate?: string | null;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const addDaysToDateInput = (dateInput: string, days: number) => {
    const match = dateInput.match(DATE_PATTERN);
    if (!match) return "";

    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );
    date.setDate(date.getDate() + days);
    return formatDateInput(date);
};

export const getDefaultAttendanceDeadline = (startDate: string) =>
    addDaysToDateInput(startDate, -2);

const normalizeTime = (time: string | null | undefined, fallback: string) => {
    const match = String(time ?? "").match(TIME_PATTERN);
    if (!match) return fallback;

    return `${match[1].padStart(2, "0")}:${match[2]}`;
};

const jstDateTime = (date: string, time: string) =>
    new Date(`${date}T${time}:00+09:00`);

export const getAttendanceResponseWindow = ({
    startDate,
    endDate,
    endTime,
    deadlineDate,
}: AttendanceResponseWindow) => {
    const normalizedStartDate = String(startDate ?? "");
    if (!DATE_PATTERN.test(normalizedStartDate)) return null;

    const normalizedEndDate = DATE_PATTERN.test(String(endDate ?? ""))
        ? String(endDate)
        : normalizedStartDate;
    const normalizedDeadlineDate = DATE_PATTERN.test(String(deadlineDate ?? ""))
        ? String(deadlineDate)
        : getDefaultAttendanceDeadline(normalizedStartDate);

    return {
        deadlineEnd: jstDateTime(normalizedDeadlineDate, "23:59"),
        sameDayStart: jstDateTime(normalizedStartDate, "05:00"),
        eventEnd: jstDateTime(
            normalizedEndDate,
            normalizeTime(endTime, "23:59")
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

    return (
        now <= window.deadlineEnd ||
        (now >= window.sameDayStart && now <= window.eventEnd)
    );
};

export const getAttendanceDeadlineLabel = (
    windowInput: AttendanceResponseWindow
) => {
    const window = getAttendanceResponseWindow(windowInput);
    if (!window) return "";

    return window.deadlineDate.replaceAll("-", "/");
};
