import { Header } from "@/src/widgets/header";
import { Sidebar } from "@/src/widgets/sidebar";
import { Dock } from "@/src/widgets/dock";

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Drawer - 大画面のみ表示 */}
            <Sidebar>{children}</Sidebar>

            {/* 小画面用のコンテンツラッパー */}
            <div className="lg:hidden flex flex-col min-h-screen pb-20">
                <Header />
                {children}
            </div>

            {/* Bottom dock - 小画面のみ表示 */}
            <Dock />
        </>
    );
}
