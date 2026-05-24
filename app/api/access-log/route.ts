import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/auth";
import { getGasApiUrl } from "@/src/shared/lib/server-env";
import { validateWriteRequest } from "@/src/shared/lib/csrf";

const GAS_API_URL = getGasApiUrl();

const accessLogSchema = z.object({
    logs: z
        .array(
            z.object({
                path: z
                    .string()
                    .min(1)
                    .max(200)
                    .regex(/^\/[A-Za-z0-9/_-]*$/),
                clientTimestamp: z.string().datetime().optional(),
            })
        )
        .min(1)
        .max(10),
});

const getIpAddress = (request: NextRequest) => {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0]?.trim() || "";
    }

    return (
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip") ||
        ""
    );
};

const hashIpAddress = (ipAddress: string) => {
    if (!ipAddress) return "";
    return createHash("sha256").update(ipAddress).digest("hex");
};

export async function POST(request: NextRequest) {
    const writeRequestError = validateWriteRequest(request);
    if (writeRequestError) return writeRequestError;

    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!GAS_API_URL) {
        return NextResponse.json(
            { success: false, error: "GAS API URL is not configured" },
            { status: 500 }
        );
    }

    const body = await request.json().catch(() => null);
    const validation = accessLogSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { success: false, error: "Invalid access log payload" },
            { status: 400 }
        );
    }

    const url = new URL(GAS_API_URL);
    url.searchParams.set("path", "access-logs");

    const now = new Date().toISOString();
    const userAgent = request.headers.get("user-agent") || "";
    const ipHash = hashIpAddress(getIpAddress(request));

    try {
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                logs: validation.data.logs.map((log) => ({
                    timestamp: now,
                    clientTimestamp: log.clientTimestamp || "",
                    studentId: session.studentId || "",
                    displayName:
                        session.displayName ||
                        session.memberName ||
                        session.user?.name ||
                        "",
                    permission: session.permission || "",
                    path: log.path,
                    method: "GET",
                    userAgent,
                    ipHash,
                })),
            }),
        });

        const data = await response.json();
        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch (error) {
        console.error("Access log write failed:", error);
        return NextResponse.json(
            { success: false, error: "Access log write failed" },
            { status: 500 }
        );
    }
}
