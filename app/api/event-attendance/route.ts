import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import {
    eventAttendanceUpdateSchema,
    formatValidationErrors,
} from "@/src/shared/lib/validation";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";

const BACKEND_API_URL = getBackendApiUrl();

const extractStudentId = (email: string | null | undefined): string => {
    if (!email) return "";
    return email.split("@")[0].substring(0, 7).toLowerCase();
};

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    const eventId = request.nextUrl.searchParams.get("eventId") || "";
    if (!eventId) {
        return NextResponse.json(
            { success: false, error: "eventId is required" },
            { status: 400 }
        );
    }

    const url = new URL(BACKEND_API_URL);
    url.searchParams.set("path", "event-attendance");
    url.searchParams.set("eventId", eventId);

    const response = await fetch(url.toString(), {
        headers: {
            "Content-Type": "application/json",
            ...getBackendApiHeaders(),
        },
        cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, {
        status: response.status,
        headers: { "Cache-Control": "no-store, max-age=0" },
    });
}

const updateEventAttendance = async (request: NextRequest) => {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    if (!BACKEND_API_URL) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    const body = await request.json();
    const validation = eventAttendanceUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            {
                success: false,
                error: "バリデーションエラー",
                details: formatValidationErrors(validation.error),
            },
            { status: 400 }
        );
    }

    const url = new URL(BACKEND_API_URL);
    url.searchParams.set("path", "event-attendance");

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getBackendApiHeaders(),
        },
        body: JSON.stringify({
            ...validation.data,
            checkedBy: extractStudentId(session.user.email),
        }),
    });

    const data = await response.json();
    if (data?.success === true) {
        revalidateTag(CACHE_TAGS.eventAttendance, "max");
    }

    return NextResponse.json(data, { status: response.status });
};

export async function POST(request: NextRequest) {
    return updateEventAttendance(request);
}

export async function PUT(request: NextRequest) {
    return updateEventAttendance(request);
}
