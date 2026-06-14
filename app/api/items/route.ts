import { NextResponse } from "next/server";

const notMigrated = () =>
    NextResponse.json(
        {
            success: false,
            error: "Items are not migrated to D1 yet",
        },
        { status: 501 }
    );

/**
 * Items are intentionally excluded from the first D1 migration because the
 * registration model is expected to change.
 */
export async function POST() {
    return notMigrated();
}

export async function PUT() {
    return notMigrated();
}

export async function DELETE() {
    return notMigrated();
}
