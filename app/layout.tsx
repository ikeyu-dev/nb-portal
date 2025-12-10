import type { Metadata } from "next";
import "../src/shared/styles/globals.css";
import { Header } from "../src/widgets/header";
import { Sidebar } from "../src/widgets/sidebar";
import { Dock } from "../src/widgets/dock";

export const metadata: Metadata = {
    title: "NB-Portal",
    description: "NB-Portalへようこそ",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body>
                {/* Drawer - 大画面のみ表示 */}
                <Sidebar>{children}</Sidebar>

                {/* 小画面用のコンテンツラッパー */}
                <div className="md:hidden flex flex-col min-h-screen pb-20">
                    <Header />
                    {children}
                </div>

                {/* Bottom dock - 小画面のみ表示 */}
                <Dock />
            </body>
        </html>
    );
}
