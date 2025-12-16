import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    register: true,
    disable: process.env.NODE_ENV === "development",
    extendDefaultRuntimeCaching: true,
    workboxOptions: {
        importScripts: ["/sw.js"],
    },
});

const nextConfig: NextConfig = {
    /* config options here */
    turbopack: {},
};

export default withPWA(nextConfig);
