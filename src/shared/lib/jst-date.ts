const jstDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

const getPart = (
    parts: Intl.DateTimeFormatPart[],
    type: Intl.DateTimeFormatPartTypes
) => parts.find((part) => part.type === type)?.value || "";

export const formatJstDateInput = (date = new Date()) => {
    const parts = jstDateTimeFormatter.formatToParts(date);
    return `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")}`;
};

export const formatJstTimestamp = (date = new Date()) => {
    const parts = jstDateTimeFormatter.formatToParts(date);
    return `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")}T${getPart(
        parts,
        "hour"
    )}:${getPart(parts, "minute")}:${getPart(parts, "second")}+09:00`;
};

export const parseDateInput = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};
