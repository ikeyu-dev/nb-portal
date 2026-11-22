import { NextRequest, NextResponse } from "next/server";
import { auth, resolveMemberProfile } from "@/src/auth";
import { validateWriteRequest } from "@/src/shared/lib/csrf";
import {
    getBackendApiHeaders,
    getBackendApiUrl,
} from "@/src/shared/lib/server-env";

const officers = new Set(["HEAD", "SUB_HEAD", "ACCOUNTANT"]);

const json = (body: unknown, status = 200) =>
    NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });

async function getOfficerActor() {
    const session = await auth();
    if (!session?.studentId)
        return {
            error: json({ success: false, error: "ログインが必要です" }, 401),
        };

    const permission =
        session.permission ||
        (await resolveMemberProfile(session.studentId)).permission;
    if (!permission || !officers.has(permission)) {
        return {
            error: json(
                { success: false, error: "幹部役員のみ利用できます" },
                403
            ),
        };
    }

    return { actor: session.studentId };
}

export async function GET() {
    const { actor, error } = await getOfficerActor();
    if (error) return error;

    try {
        const url = new URL(getBackendApiUrl());
        url.searchParams.set("path", "line-relay-contacts");
        url.searchParams.set("actor", actor!);
        const response = await fetch(url, {
            headers: getBackendApiHeaders(),
            cache: "no-store",
        });
        return json(await response.json(), response.status);
    } catch {
        return json(
            { success: false, error: "部長一覧を取得できませんでした" },
            502
        );
    }
}

async function write(request: NextRequest, deleteCandidate: boolean) {
    const invalid = validateWriteRequest(request);
    if (invalid) return invalid;
    const { actor, error } = await getOfficerActor();
    if (error) return error;

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return json({ success: false, error: "入力内容を読み取れません" }, 400);
    }

    try {
        const url = new URL(getBackendApiUrl());
        url.searchParams.set("path", "line-relay-contacts");
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getBackendApiHeaders(),
            },
            body: JSON.stringify(
                deleteCandidate
                    ? { deleteCandidateUserId: body?.userId ?? null, actor }
                    : { contacts: body?.contacts, actor }
            ),
            cache: "no-store",
        });
        return json(await response.json(), response.status);
    } catch {
        return json(
            {
                success: false,
                error: deleteCandidate
                    ? "候補を削除できませんでした"
                    : "部長一覧を保存できませんでした",
            },
            502
        );
    }
}

export async function PUT(request: NextRequest) {
    return write(request, false);
}

export async function DELETE(request: NextRequest) {
    return write(request, true);
}
