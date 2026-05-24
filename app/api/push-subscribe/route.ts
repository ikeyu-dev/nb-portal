import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getGasApiUrl } from "@/src/shared/lib/server-env";
import { validateWriteRequest } from "@/src/shared/lib/csrf";

const GAS_API_URL = getGasApiUrl();

const extractStudentId = (email: string | null | undefined): string => {
    if (!email) return "";
    return email.split("@")[0].substring(0, 7).toLowerCase();
};

export async function POST(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { subscription } = body;
        const studentId =
            session.studentId || extractStudentId(session.user.email);

        if (!subscription || !studentId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // GASに購読情報を登録
        const response = await fetch(`${GAS_API_URL}?path=push-subscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                subscription,
                studentId,
            }),
        });

        const data = await response.json();

        if (data.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { error: data.error || "Failed to save subscription" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error saving push subscription:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json(
                { error: "Missing endpoint" },
                { status: 400 }
            );
        }

        // GASから購読情報を削除
        const response = await fetch(`${GAS_API_URL}?path=push-unsubscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                endpoint,
            }),
        });

        const data = await response.json();

        if (data.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { error: data.error || "Failed to remove subscription" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error removing push subscription:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
