/**
 * Integration tests for negative cases
 * 
 * Tests that verify filters correctly EXCLUDE unwanted data:
 * - Unpublished posts excluded when filtering for published
 * - Low values excluded when filtering for high values
 * - Non-matching data excluded by string filters
 * - Filters work correctly with AND/OR operators
 * - Date range filters exclude out-of-range dates
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { setupTestData } from "./setup";
import { BlogPostContentType } from "../decoupla.config";

describe("Negative Case Tests - Filter Exclusions", () => {
    let config: Awaited<ReturnType<typeof setupTestData>>["config"];
    let testAuthorIds: string[] = [];

    beforeAll(async () => {
        const setup = await setupTestData();
        config = setup.config;
        testAuthorIds = setup.testAuthorIds;
    });

    it("should correctly exclude unpublished posts when filtering for published ones", async () => {
        console.log("\n❌ Testing that unpublished posts are correctly excluded from published filter...");

        const publishedPosts = await config.getEntries(BlogPostContentType, {
            filters: {
                IsPublished: { eq: true },
            },
        });

        expect(publishedPosts.data.every((post) => post.isPublished! === true)).toBe(true);

        const unpublishedCount = publishedPosts.data.filter((post) => post.isPublished! === false).length;
        expect(unpublishedCount).toBe(0);

        console.log(`✅ Filter correctly excluded all unpublished posts (0 unpublished in ${publishedPosts.data.length} published results)`);
    });

    it("should correctly exclude low view count posts when filtering for high view count", async () => {
        console.log("\n❌ Testing that low view count posts are correctly excluded...");

        const highViewPosts = await config.getEntries(BlogPostContentType, {
            filters: {
                ViewCount: { gte: 200 },
            },
        });

        expect(highViewPosts.data.length).toBeGreaterThan(0);

        const lowViewPosts = highViewPosts.data.filter((post) => (post.viewCount ?? 0) < 200);
        expect(lowViewPosts.length).toBe(0);

        console.log(`✅ Filter correctly excluded all low view count posts (0 posts with view_count < 200 in ${highViewPosts.data.length} results)`);
    });

    it("should correctly exclude non-matching string filters", async () => {
        console.log("\n❌ Testing that posts not matching string filter are excluded...");

        const typescriptPosts = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { contains: "TypeScript" },
            },
        });

        expect(typescriptPosts.data.length).toBeGreaterThan(0);

        const nonMatchingPosts = typescriptPosts.data.filter((post) => !post.title.includes("TypeScript"));
        expect(nonMatchingPosts.length).toBe(0);

        console.log(`✅ Filter correctly excluded all non-matching posts (0 posts without "TypeScript" in ${typescriptPosts.data.length} results)`);
    });

    it("should validate AND operator correctly excludes when ANY condition fails", async () => {
        console.log("\n❌ Testing AND operator excludes when any condition doesn't match...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                and: [
                    { Title: { contains: "TypeScript" } },
                    { IsPublished: { eq: true } },
                ],
            },
        });

        expect(entries.data.length).toBeGreaterThan(0);

        entries.data.forEach((post) => {
            expect(post.title.includes("TypeScript")).toBe(true);
            expect(post.isPublished).toBe(true);
        });

        const invalidCount = entries.data.filter((post) =>
            !post.title.includes("TypeScript") || post.isPublished !== true
        ).length;
        expect(invalidCount).toBe(0);

        console.log(`✅ AND operator correctly enforced both conditions - 0 invalid results in ${entries.data.length} total`);
    });

    it("should validate OR operator includes when ANY condition matches", async () => {
        console.log("\n❌ Testing OR operator includes results matching ANY condition...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                or: [
                    { Title: { starts_with: "Type" } },
                    { IsPublished: { eq: false } },
                ],
            },
        });

        expect(entries.data.length).toBeGreaterThan(0);

        entries.data.forEach((post) => {
            const condition1 = post.title.startsWith("Type");
            const condition2 = post.isPublished! === false;
            expect(condition1 || condition2).toBe(true);
        });

        const invalidCount = entries.data.filter((post) =>
            !post.title.startsWith("Type") && post.isPublished !== false
        ).length;
        expect(invalidCount).toBe(0);

        console.log(`✅ OR operator correctly included results matching any condition - 0 invalid results in ${entries.data.length} total`);
    });

    it("should validate filtering by reference correctly excludes non-matching references", async () => {
        console.log("\n❌ Testing reference filter excludes non-matching authors...");

        if (testAuthorIds.length < 2) {
            console.log("⏳ Need at least 2 authors, skipping test");
            return;
        }

        const authorId = testAuthorIds[0]!;
        const otherAuthorId = testAuthorIds[1]!;

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                Author: { id: { eq: authorId } },
            },
        });

        expect(entries.data.length).toBeGreaterThan(0);

        const wrongAuthorCount = entries.data.filter((post) => {
            const postAuthorId = typeof post.author === 'object' && post.author !== null && 'id' in post.author
                ? (post.author as any).id
                : '';
            return postAuthorId === otherAuthorId;
        }).length;
        expect(wrongAuthorCount).toBe(0);

        console.log(`✅ Reference filter correctly excluded other authors - 0 posts by other author in ${entries.data.length} results`);
    });

    it("should validate date range filter excludes out-of-range dates", async () => {
        console.log("\n❌ Testing date filter excludes dates outside range...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                PublishedDate: { gte: "2025-01-01" },
            },
        });

        expect(entries.data.length).toBeGreaterThan(0);

        const tooEarlyCount = entries.data.filter((post) => {
            const date = post.publishedDate;
            return date && date < "2025-01-01";
        }).length;
        expect(tooEarlyCount).toBe(0);

        console.log(`✅ Date filter correctly excluded dates before range - 0 early dates in ${entries.data.length} results`);
    });
});
