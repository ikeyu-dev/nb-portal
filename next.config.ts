import type { NextConfig } from "next";

const securityHeaders = [
    {
        key: "X-DNS-Prefetch-Control",
        value: "on",
    },
    {
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
    },
    {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
    },
];

const nextConfig: NextConfig = {
    turbopack: {},
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
            {
                // PDFファイルはiframeでの表示を同一オリジンから許可
                source: "/documents/:path*.pdf",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                ],
            },
            {
                // SVGファイルはiframeでの表示を同一オリジンから許可
                source: "/documents/:path*.svg",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
