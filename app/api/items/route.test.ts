// @vitest-environment node

import { describe, expect, it } from "vitest";
import { DELETE, POST, PUT } from "./route";

describe("/api/items", () => {
    it.each([
        ["POST", POST],
        ["PUT", PUT],
        ["DELETE", DELETE],
    ] as const)("%sはD1未移行を示す501を返す", async (_method, handler) => {
        const response = await handler();

        expect(response.status).toBe(501);
        expect(await response.json()).toEqual({
            success: false,
            error: "Items are not migrated to D1 yet",
        });
    });
});
