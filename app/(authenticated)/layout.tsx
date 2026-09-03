import { Header } from "@/src/widgets/header";
import { Sidebar } from "@/src/widgets/sidebar";
import { Dock } from "@/src/widgets/dock";
import { AccessLogger } from "@/src/features/access-log/AccessLogger";
import { PWANotificationPrompt } from "@/src/features/pwa-install";
import { auth } from "@/src/auth";

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <>
            <AccessLogger />
            <PWANotificationPrompt userEmail={session?.user?.email || null} />

            <div className="flex min-h-dvh">
                <Sidebar session={session} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="shrink-0 lg:hidden">
                        <Header />
                    </div>
                    <div className="flex-1 pb-28 lg:pb-0">{children}</div>
                </div>
            </div>

            <Dock />
        </>
    );
}
