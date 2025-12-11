import type { Metadata } from "next";
import "@/src/shared/styles/globals.css";

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
            <body>{children}</body>
        </html>
    );
}
