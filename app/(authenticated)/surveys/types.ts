export type QuestionType =
    | "short"
    | "long"
    | "single"
    | "multiple"
    | "date"
    | "number";

export type Question = {
    id: string;
    sectionId: string;
    label: string;
    type: QuestionType;
    required: boolean;
    options: { id: string; label: string }[];
};

export type SurveySection = {
    id: string;
    title: string;
    description: string;
};

export type Answers = Record<string, string | string[]>;

export type SurveySummary = {
    id: string;
    title: string;
    description: string;
    creator_id: string;
    deadline_at: string | null;
    status: "draft" | "published" | "closed";
};

export type Survey = {
    id: string;
    title: string;
    description: string;
    creatorId: string;
    deadlineAt: string | null;
    resultsPublic: boolean;
    status: "draft" | "published" | "closed";
    open: boolean;
    canEdit: boolean;
    lockedQuestions: string[];
    lockedOptions: string[];
    questions: Question[];
    sections: SurveySection[];
    mine: {
        draft: Answers;
        submitted: Answers | null;
        updatedAt: string;
        currentSectionId: string | null;
    } | null;
    responses?: {
        studentId: string;
        nickname: string | null;
        name: string;
        answers: Answers;
        submittedAt: string;
    }[];
};
