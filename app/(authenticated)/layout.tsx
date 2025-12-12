import { Header } from "@/src/widgets/header";
import { Sidebar } from "@/src/widgets/sidebar";
import { Dock } from "@/src/widgets/dock";
import { auth } from "@/src/auth";

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <>
            {/* Drawer - 大画面のみ表示 */}
            <Sidebar>{children}</Sidebar>

            {/* 小画面用のコンテンツラッパー */}
            <div className="lg:hidden flex flex-col min-h-dvh">
                <Header />
                <div className="flex-1 pb-16">{children}</div>
            </div>

            {/* Bottom dock - 小画面のみ表示 */}
            <Dock user={session?.user} />
        </>
    );
}
