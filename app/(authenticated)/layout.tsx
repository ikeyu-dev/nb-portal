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

            {/* Drawer - 大画面のみ表示 */}
            <Sidebar>{children}</Sidebar>

            {/* 小画面用のコンテンツラッパー */}
            <div className="lg:hidden flex flex-col min-h-dvh">
                <Header />
                <div className="flex-1 pb-28">{children}</div>
            </div>

            {/* Bottom dock - 小画面のみ表示 */}
            <Dock />
        </>
    );
}
