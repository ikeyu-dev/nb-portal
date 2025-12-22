import type { Metadata, Viewport } from "next";
import "@/src/shared/styles/globals.css";
import { ServiceWorkerRegistration } from "@/src/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
    title: "NB-Portal",
    description: "NB-Portal - 部活動管理ポータル",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "NB-Portal",
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport: Viewport = {
    themeColor: "#2a83a2",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <head>
                <link
                    rel="apple-touch-icon"
                    href="/icons/icon-192x192.png"
                />
            </head>
            <body>
                <ServiceWorkerRegistration />
                {children}
            </body>
        </html>
    );
}
