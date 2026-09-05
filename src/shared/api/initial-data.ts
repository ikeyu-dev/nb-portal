import { unstable_rethrow } from "next/navigation";
import { auth } from "@/src/auth";
import { getBackendApiHeaders, getBackendApiUrl } from "@/src/shared/lib/server-env";
import type { BackendApiPath } from "@/src/shared/lib/validation";
import type { ApiResponse } from "@/src/shared/types/api";

export async function getInitialData<T>(
    path: BackendApiPath,
    params: Record<string, string> = {},
): Promise<T | null> {
    const session = await auth();
    if (!session) throw new Error("Unauthorized");

    try {
        const url = new URL(getBackendApiUrl());
        url.searchParams.set("path", path);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        const response = await fetch(url, {
            headers: getBackendApiHeaders(),
            cache: "no-store",
        });
        if (!response.ok) return null;
        const result = await response.json() as ApiResponse<T>;
        return result.success ? result.data ?? null : null;
    } catch (error) {
        unstable_rethrow(error);
        console.error("Initial data fetch failed:", path, error);
        return null;
    }
}
