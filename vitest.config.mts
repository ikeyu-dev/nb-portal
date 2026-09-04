import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
    resolve: {
        alias: [
            {
                find: "@/features",
                replacement: fileURLToPath(
                    new URL("./src/features", import.meta.url),
                ),
            },
            {
                find: "@/widgets",
                replacement: fileURLToPath(
                    new URL("./src/widgets", import.meta.url),
                ),
            },
            {
                find: "@/shared",
                replacement: fileURLToPath(
                    new URL("./src/shared", import.meta.url),
                ),
            },
            {
                find: "@",
                replacement: fileURLToPath(new URL(".", import.meta.url)),
            },
        ],
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        include: [
            "app/**/*.test.{ts,tsx}",
            "src/**/*.test.{ts,tsx}",
        ],
    },
});
