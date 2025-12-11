import { signIn } from "@/src/auth";
import Image from "next/image";

export default function LoginPage() {
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
                        <button
                            type="submit"
                            className="btn btn-primary gap-2"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 23 23"
                                className="w-5 h-5"
                            >
                                <path
                                    fill="currentColor"
                                    d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"
                                />
                            </svg>
                            Microsoftでログイン
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
