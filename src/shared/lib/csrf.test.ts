// @vitest-environment node

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
    validateContentType,
    validateOrigin,
    validateWriteRequest,
} from "./csrf";

const request = (
    method: "GET" | "POST",
    headers: Record<string, string> = {}
) =>
    new NextRequest("https://portal.example.test/api/test", {
        method,
        headers: { host: "portal.example.test", ...headers },
        ...(method === "POST" ? { body: "{}" } : {}),
    });

describe("CSRF検証", () => {
    it("GETはOriginとContent-Typeを要求しない", () => {
        const getRequest = request("GET");
        expect(validateOrigin(getRequest)).toBeNull();
        expect(validateContentType(getRequest)).toBeNull();
    });

    it("同一Originの書き込みを受理する", () => {
        expect(
            validateWriteRequest(
                request("POST", {
                    origin: "https://portal.example.test",
                    "content-type": "application/json; charset=utf-8",
                })
            )
        ).toBeNull();
    });

    it("異なるOriginの書き込みを403で拒否する", async () => {
        const response = validateOrigin(
            request("POST", { origin: "https://attacker.example.test" })
        );

        expect(response?.status).toBe(403);
        expect(await response?.json()).toEqual({ error: "CSRF validation failed" });
    });

    it("Originがなければ同一ホストのRefererを受理する", () => {
        expect(
            validateOrigin(
                request("POST", {
                    referer: "https://portal.example.test/calendar?modal=create",
                })
            )
        ).toBeNull();
    });

    it("Originがなくても異なるRefererは拒否する", async () => {
        const response = validateOrigin(
            request("POST", { referer: "https://attacker.example.test/form" })
        );

        expect(response?.status).toBe(403);
        expect(await response?.json()).toEqual({ error: "CSRF validation failed" });
    });

    it("OriginとRefererの両方がない書き込みは現在受理する", () => {
        expect(validateOrigin(request("POST"))).toBeNull();
    });

    it("JSON以外のContent-Typeを415で拒否する", async () => {
        const response = validateContentType(
            request("POST", { "content-type": "text/plain" })
        );

        expect(response?.status).toBe(415);
        expect(await response?.json()).toEqual({ error: "Invalid Content-Type" });
    });

    it("複合検証ではOriginエラーをContent-Typeより先に返す", async () => {
        const response = validateWriteRequest(
            request("POST", {
                origin: "https://attacker.example.test",
                "content-type": "text/plain",
            })
        );

        expect(response?.status).toBe(403);
        expect(await response?.json()).toEqual({ error: "CSRF validation failed" });
    });
});
