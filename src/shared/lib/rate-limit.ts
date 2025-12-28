import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Upstash Redisベースのレート制限
 * 環境変数が設定されていない場合は無効化される
 */

const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
              url: process.env.UPSTASH_REDIS_REST_URL,
              token: process.env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null;

/**
 * APIエンドポイント用のレート制限
 * 1分間に20リクエストまで許可
 */
export const apiRateLimiter = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(20, "1 m"),
          analytics: true,
          prefix: "ratelimit:api",
      })
    : null;

/**
 * 認証エンドポイント用のレート制限
 * 1分間に5リクエストまで許可（ブルートフォース対策）
 */
export const authRateLimiter = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(5, "1 m"),
          analytics: true,
          prefix: "ratelimit:auth",
      })
    : null;

/**
 * レート制限チェックを実行
 * @param limiter レート制限インスタンス
 * @param identifier ユーザー識別子（IPアドレスやユーザーID）
 * @returns レート制限超過時はエラーレスポンス、それ以外はnull
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string
): Promise<NextResponse | null> {
    if (!limiter) {
        return null;
    }

    try {
        const { success, limit, remaining, reset } =
            await limiter.limit(identifier);

        if (!success) {
            return NextResponse.json(
                {
                    error: "Too many requests",
                    message: "リクエスト数が制限を超えました。しばらく待ってから再試行してください。",
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": remaining.toString(),
                        "X-RateLimit-Reset": reset.toString(),
                        "Retry-After": Math.ceil(
                            (reset - Date.now()) / 1000
                        ).toString(),
                    },
                }
            );
        }

        return null;
    } catch (error) {
        console.error("Rate limit check failed:", error);
        return null;
    }
}

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    return "unknown";
}
