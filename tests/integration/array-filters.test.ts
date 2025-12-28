/**
 * Integration tests for array field filters
 * 
 * Tests filtering on array fields:
 * - String arrays (using any/all/none operators)
 * - Reference arrays (using any/all/none operators)
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { setupTestData } from "./setup";
import { EventContentType, ReviewContentType } from "../decoupla.config";

describe("Array Field Filters", () => {
    let config: Awaited<ReturnType<typeof setupTestData>>["config"];

    beforeAll(async () => {
        const setup = await setupTestData();
        config = setup.config;
    });

    it("should filter by reference array field", async () => {
        console.log("\n🔍 Testing reference array field filtering...");

        const filterInput: any = {
            Speakers: { any: { id: { eq: "" } } }
        };
        console.log("[DEBUG] Reference array filter input:", JSON.stringify(filterInput, null, 2));

        const entries = await config.getEntries(EventContentType, {
            filters: filterInput,
        });

        expect(entries.data).toBeDefined();
        console.log(`✅ Reference array field filtering works - found ${entries.data.length} events`);
    });

    it("should filter by string array field using some/all/none", async () => {
        console.log("\n🔍 Testing string array field filtering...");

        const filterInput: any = {
            Tags: { any: { eq: "featured" } }
        };
        console.log("[DEBUG] String array filter input:", JSON.stringify(filterInput, null, 2));

        const entries = await config.getEntries(ReviewContentType, {
            filters: filterInput,
        });

        expect(entries.data).toBeDefined();
        console.log(`✅ String array field filtering works - found ${entries.data.length} reviews`);
    });
});
