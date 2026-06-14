import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/src/auth";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import {
    formatValidationErrors,
    taskDeleteSchema,
    taskUpsertSchema,
} from "@/src/shared/lib/validation";

const BACKEND_API_URL = getBackendApiUrl();

const extractStudentId = (email: string | null | undefined): string => {
    if (!email) return "";
    return email.split("@")[0].substring(0, 7).toLowerCase();
};

const requireAuth = async () => {
    const session = await auth();
    if (!session?.user) {
        return {
            session: null,
            response: NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            ),
        };
    }

    return { session, response: null };
};

const getBackendUrl = (path: string) => {
    if (!BACKEND_API_URL) return null;
    const url = new URL(BACKEND_API_URL);
    url.searchParams.append("path", path);
    return url;
};

export async function GET() {
    const { response } = await requireAuth();
    if (response) return response;

    const url = getBackendUrl("tasks");
    if (!url) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    const backendResponse = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: getBackendApiHeaders(),
    });

    return NextResponse.json(await backendResponse.json(), {
        status: backendResponse.ok ? 200 : backendResponse.status,
    });
}

export async function POST(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    const { session, response } = await requireAuth();
    if (response) return response;

    const url = getBackendUrl("tasks");
    if (!url) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    const body = await request.json();
    const validation = taskUpsertSchema.safeParse(body);
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

    const actor =
        session?.studentId ||
        extractStudentId(session?.user?.email) ||
        session?.displayName ||
        session?.memberName ||
        "unknown";

    const backendResponse = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getBackendApiHeaders(),
        },
        body: JSON.stringify({
            ...validation.data,
            dueDate: validation.data.dueDate || undefined,
            createdBy: actor,
            updatedBy: actor,
        }),
    });

    const data = await backendResponse.json();
    if (data?.success === true) {
        revalidateTag(CACHE_TAGS.tasks, "max");
    }

    return NextResponse.json(data, {
        status: backendResponse.ok ? 200 : backendResponse.status,
    });
}

export async function DELETE(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    const { response } = await requireAuth();
    if (response) return response;

    const url = getBackendUrl("tasks/delete");
    if (!url) {
        return NextResponse.json(
            { success: false, error: "Backend API URL is not configured" },
            { status: 500 }
        );
    }

    const body = await request.json();
    const validation = taskDeleteSchema.safeParse(body);
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

    const backendResponse = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getBackendApiHeaders(),
        },
        body: JSON.stringify(validation.data),
    });

    const data = await backendResponse.json();
    if (data?.success === true) {
        revalidateTag(CACHE_TAGS.tasks, "max");
    }

    return NextResponse.json(data, {
        status: backendResponse.ok ? 200 : backendResponse.status,
    });
}
