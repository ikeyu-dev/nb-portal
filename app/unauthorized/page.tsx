import Image from "next/image";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          {/* Logo */}
          <div className="mb-4">
            <Image
              src="/nb_logo.png"
              alt="NB Logo"
              width={180}
              height={72}
              priority
              className="w-auto h-auto"
            />
          </div>

          {/* Error Icon */}
          <div className="text-error mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="card-title text-2xl mb-2 text-error">
            アクセス権限がありません
          </h1>
          <p className="text-base-content/70 mb-6">
            このアプリケーションは部員専用です。
            <br />
            部員登録がされていないアカウントではアクセスできません。
          </p>

          <div className="flex flex-col gap-2 w-full">
            <Link href="/login" className="btn btn-primary w-full">
              別のアカウントでログイン
            </Link>
            <Link href="/" className="btn btn-outline btn-neutral w-full">
              トップページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
