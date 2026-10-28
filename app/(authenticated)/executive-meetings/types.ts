export type Agenda = { id: string; title: string; body: string };
export type MeetingContent = { agendas: Agenda[]; other: string };
export type MeetingRecord = {
    id: string;
    seriesId: string;
    meetingNumber: number;
    title: string;
    meetingDate: string | null;
    startTime: string | null;
    locationType: string | null;
    locationDetail: string;
    attendeeStudentNumbers: string[];
    content: MeetingContent;
    markdown: string;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
    attendees: Array<{
        studentNumber: string;
        nickname: string | null;
        name: string;
    }>;
    creator: { studentNumber: string; nickname: string | null; name: string };
    availableOfficers: Array<{
        studentNumber: string;
        nickname: string | null;
        name: string;
        permission: string;
    }>;
    canEdit: boolean;
    discord: {
        embed: {
            state: string;
            sentAt: string | null;
            attemptCount: number;
            error: string | null;
        };
        body: {
            state: string;
            sentAt: string | null;
            attemptCount: number;
            error: string | null;
        };
        sentAt: string | null;
    };
};

export type MeetingSummary = Pick<
    MeetingRecord,
    | "id"
    | "seriesId"
    | "meetingNumber"
    | "title"
    | "meetingDate"
    | "startTime"
    | "locationType"
    | "locationDetail"
    | "attendeeStudentNumbers"
    | "content"
    | "createdBy"
    | "createdAt"
    | "updatedBy"
    | "updatedAt"
    | "discord"
>;

export type ApiResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};
