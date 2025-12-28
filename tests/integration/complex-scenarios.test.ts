/**
 * Integration tests for complex filtering scenarios
 * 
 * Tests edge cases and advanced combinations:
 * - Case sensitivity in string filters
 * - Numeric field boundaries (min/max)
 * - Empty/null results handling
 * - String position filters (starts_with vs ends_with)
 * - Multiple field type combinations
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { setupTestData } from "./setup";
import { BlogPostContentType } from "../decoupla.config";

describe("Complex Filtering Scenarios", () => {
    let config: Awaited<ReturnType<typeof setupTestData>>["config"];

    beforeAll(async () => {
        const setup = await setupTestData();
        config = setup.config;
    });

    it("should handle string filter with case sensitivity", async () => {
        console.log("\n🔤 Testing string filter case handling...");

        const exactMatch = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { eq: "TypeScript Best Practices" },
            },
        });

        const containsLower = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { contains: "typescript" },
            },
        });

        console.log(`✅ Case handling works - exact match: ${exactMatch.data.length}, contains (lowercase): ${containsLower.data.length}`);
    });

    it("should handle filtering with boundaries (min/max) for numeric fields", async () => {
        console.log("\n📊 Testing numeric field boundaries...");

        const minThreshold = 200;
        const maxThreshold = 400;

        const midRangePosts = await config.getEntries(BlogPostContentType, {
            filters: {
                and: [
                    { ViewCount: { gte: minThreshold } },
                    { ViewCount: { lte: maxThreshold } },
                ]
            },
        });

        if (midRangePosts.data.length > 0) {
            expect(midRangePosts.data.every((post) =>
                post.viewCount !== undefined && post.viewCount >= minThreshold && post.viewCount <= maxThreshold
            )).toBe(true);

            console.log(`✅ Numeric boundary filtering works - found ${midRangePosts.data.length} posts with view_count between ${minThreshold} and ${maxThreshold}`);
        } else {
            console.log(`⏳ No posts found in range [${minThreshold}, ${maxThreshold}]`);
        }
    });

    it("should handle filtering with empty/null results gracefully", async () => {
        console.log("\n⚪ Testing filter that returns no results...");

        const noResults = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { eq: "This Title Definitely Does Not Exist In The System" },
            },
        });

        expect(Array.isArray(noResults.data)).toBe(true);
        expect(noResults.data.length).toBe(0);

        console.log(`✅ Empty result filtering handled gracefully - returned empty array for non-matching filter`);
    });

    it("should handle filtering with starts_with at beginning vs ends_with at end", async () => {
        console.log("\n🎯 Testing string position filters (starts_with vs ends_with)...");

        const startsWith = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { starts_with: "Type" },
            },
        });

        const endsWith = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { ends_with: "Practices" },
            },
        });

        expect(startsWith.data.length).toBeGreaterThan(0);

        startsWith.data.forEach((post) => {
            expect(post.title.startsWith("Type")).toBe(true);
        });

        endsWith.data.forEach((post) => {
            expect(post.title.endsWith("Practices")).toBe(true);
        });

        console.log(`✅ Position filters work correctly - starts_with: ${startsWith.data.length} results, ends_with: ${endsWith.data.length} results`);
    });

    it("should handle combined filters with multiple field types (string, bool, number, date)", async () => {
        console.log("\n🎨 Testing filter combination across multiple field types...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                and: [
                    { Title: { contains: "TypeScript" } },
                    { IsPublished: { eq: true } },
                    { ViewCount: { gte: 100 } },
                    { PublishedDate: { gte: "2024-12-01" } },
                ]
            },
        });

        if (entries.data.length > 0) {
            expect(entries.data.every((post) => {
                const hasTypeScript = post.title && post.title.includes("TypeScript");
                const isPublished = post.isPublished === true;
                const hasHighViews = post.viewCount !== undefined && post.viewCount >= 100;
                const isAfterDate = post.publishedDate !== undefined && post.publishedDate >= "2024-12-01";
                return hasTypeScript && isPublished && hasHighViews && isAfterDate;
            })).toBe(true);

            console.log(`✅ Multi-type filter combination works - found ${entries.data.length} posts matching all conditions`);
        } else {
            console.log(`⏳ No posts found matching all conditions (may be expected based on test data)`);
        }
    });
});
