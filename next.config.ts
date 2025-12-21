import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    register: true,
    disable: process.env.NODE_ENV === "development",
    customWorkerSrc: "worker",
    customWorkerDest: "public",
    customWorkerPrefix: "sw",
});

const nextConfig: NextConfig = {
    /* config options here */
    turbopack: {},
};

export default withPWA(nextConfig);
