export const CACHE_TAGS = {
    items: "items",
    schedules: "schedules",
    members: "members",
    absences: "absences",
    notifications: "notifications",
    nextMeeting: "next-meeting",
} as const;

export const CACHE_SECONDS = {
    gasData: 5 * 60,
    dashboardData: 60,
} as const;

export const CACHE_TTL_MS = {
    pageData: CACHE_SECONDS.gasData * 1000,
    stalePageData: 24 * 60 * 60 * 1000,
    meetingMemoDraft: 10 * 60 * 1000,
} as const;

export const CLIENT_CACHE_KEYS = {
    calendar: "nb-portal-calendar-cache",
    items: "nb-portal-items-cache",
    members: "nb-portal-members-cache-v2",
    notifications: "nb-portal-notifications-cache",
    meetingMemoDraft: "nb-portal-meeting-memo-draft",
} as const;
