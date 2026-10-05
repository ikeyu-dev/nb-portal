import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/auth";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";
import { CACHE_TAGS } from "@/src/shared/lib/cache-policy";

const inputSchema = z.object({
    eventId: z.string().min(1).max(100),
    studentNumbers: z.array(z.string().trim().regex(/^[a-z0-9-]{1,20}$/i)).max(300),
    expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();
const failure = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

async function handle(request: NextRequest, write: boolean) {
    if (write) {
        const invalid = validateWriteRequest(request);
        if (invalid) return invalid;
    }
    const session = await auth();
    if (!session?.user || !session.studentId) return failure("Unauthorized", 401);
    const base = getBackendApiUrl();
    if (!base) return failure("Backend API is not configured", 503);
    try {
        const actor = session.studentId.toLowerCase();
        const url = new URL(base);
        url.searchParams.set("path", "schedule-participants");
        let body;
        if (write) {
            const parsed = inputSchema.safeParse(await request.json());
            if (!parsed.success) return failure("入力内容を確認してください", 400);
            body = { ...parsed.data, actor };
        } else {
            const eventId = request.nextUrl.searchParams.get("eventId");
            if (!eventId || eventId.length > 100) return failure("予定IDを確認してください", 400);
            url.searchParams.set("eventId", eventId);
        }
        const response = await fetch(url, {
            method: write ? "POST" : "GET",
            headers: { ...getBackendApiHeaders(), "Content-Type": "application/json" },
            cache: "no-store",
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await response.json();
        if (response.ok && data.success && data.data) {
            data.data.canManage = data.data.createdBy?.toLowerCase() === actor;
            if (write) {
                revalidateTag(CACHE_TAGS.scheduleParticipants, "max");
                revalidateTag(CACHE_TAGS.schedules, "max");
                revalidateTag(CACHE_TAGS.notifications, "max");
            }
        }
        return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        return failure(error instanceof SyntaxError ? "入力内容を確認してください" : "参加者情報を取得・保存できませんでした", error instanceof SyntaxError ? 400 : 502);
    }
}
export const GET = (request: NextRequest) => handle(request, false);
export const PUT = (request: NextRequest) => handle(request, true);
