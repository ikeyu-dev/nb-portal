import { signIn } from "@/src/auth";
import Image from "next/image";
import { LoginButton } from "./LoginButton";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-base-200">
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

          <h1 className="card-title text-2xl mb-2">ログイン</h1>
          <p className="text-base-content/70 mb-6">
            大学のMicrosoftアカウントでログインしてください
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", {
                redirectTo: "/home",
              });
            }}
          >
            <LoginButton />
          </form>
        </div>
      </div>
    </div>
  );
}
