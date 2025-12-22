import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

// メールアドレスから学籍番号（最初の7文字）を抽出
const extractStudentId = (email: string | null | undefined): string => {
  if (!email) return "";
  const localPart = email.split("@")[0];
  return localPart.substring(0, 7).toLowerCase();
};

// スケジュール新規作成
export async function POST(request: NextRequest) {
  // 認証チェック
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  if (!GAS_API_URL) {
    return NextResponse.json(
      { success: false, error: "GAS API URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    // ログインユーザーの学籍番号を作成者として追加
    const createdBy = extractStudentId(session.user.email);

    // GAS APIに転送
    const url = new URL(GAS_API_URL);
    url.searchParams.append("path", "schedules");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        createdBy,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// スケジュール削除
export async function DELETE(request: NextRequest) {
  // 認証チェック
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  if (!GAS_API_URL) {
    return NextResponse.json(
      { success: false, error: "GAS API URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    // GAS APIに転送
    const url = new URL(GAS_API_URL);
    url.searchParams.append("path", "schedules/delete");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// スケジュール更新
export async function PUT(request: NextRequest) {
  // 認証チェック
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  if (!GAS_API_URL) {
    return NextResponse.json(
      { success: false, error: "GAS API URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    // ログインユーザーの学籍番号を更新者として追加
    const updatedBy = extractStudentId(session.user.email);

    // GAS APIに転送
    const url = new URL(GAS_API_URL);
    url.searchParams.append("path", "schedules/update");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        updatedBy,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
