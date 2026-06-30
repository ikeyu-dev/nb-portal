export const CACHE_TAGS = {
    items: "items",
    schedules: "schedules",
    members: "members",
    absences: "absences",
    eventAttendance: "event-attendance",
    notifications: "notifications",
    nextMeeting: "next-meeting",
    tasks: "tasks",
} as const;

export const CACHE_SECONDS = {
    backendData: 5 * 60,
    dashboardData: 60,
} as const;

export const CACHE_TTL_MS = {
    pageData: CACHE_SECONDS.backendData * 1000,
    stalePageData: 24 * 60 * 60 * 1000,
    meetingMemoDraft: 10 * 60 * 1000,
} as const;

export const CLIENT_CACHE_KEYS = {
    calendar: "nb-portal-calendar-cache",
    items: "nb-portal-items-cache",
    members: "nb-portal-members-cache-v2",
    notifications: "nb-portal-notifications-cache",
    tasks: "nb-portal-tasks-cache",
    meetingMemoDraft: "nb-portal-meeting-memo-draft",
} as const;
