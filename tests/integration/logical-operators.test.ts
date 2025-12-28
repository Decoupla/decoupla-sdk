/**
 * Integration tests for logical operators (AND/OR)
 * 
 * Tests combining multiple filters using AND and OR operators,
 * including nested combinations.
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { setupTestData } from "./setup";
import { BlogPostContentType } from "../decoupla.config";

describe("Logical Operators (AND/OR)", () => {
    let config: Awaited<ReturnType<typeof setupTestData>>["config"];

    beforeAll(async () => {
        const setup = await setupTestData();
        config = setup.config;
    });

    it("should support AND operator for multiple conditions", async () => {
        console.log("\n🔍 Testing AND operator for combined filters...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                and: [
                    { Title: { contains: "TypeScript" } },
                    { IsPublished: { eq: true } },
                ],
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.every((post) =>
            post.title.includes("TypeScript") && post.isPublished! === true
        )).toBe(true);
        console.log(`✅ AND operator correctly filters with multiple conditions (${entries.data.length} results)`);
    });

    it("should support OR operator for alternative conditions", async () => {
        console.log("\n🔍 Testing OR operator for alternative filters...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                or: [
                    { Title: { starts_with: "Type" } },
                    { IsPublished: { eq: false } },
                ],
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.every((post) =>
            post.title.startsWith("Type") || post.isPublished! === false
        )).toBe(true);
        console.log(`✅ OR operator correctly filters with alternative conditions (${entries.data.length} results)`);
    });

    it("should support nested AND/OR combinations", async () => {
        console.log("\n🔍 Testing nested AND/OR operator combinations...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                or: [
                    {
                        and: [
                            { Title: { contains: "TypeScript" } },
                            { IsPublished: { eq: true } },
                        ],
                    },
                    { Title: { ends_with: "Practices" } },
                ],
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((post) => {
            const condition1 = post.title.includes("TypeScript") && post.isPublished! === true;
            const condition2 = post.title.endsWith("Practices");
            return condition1 || condition2;
        })).toBe(true);

        console.log(`✅ Nested AND/OR combinations work correctly (${entries.data.length} results)`);
    });

    it("should combine string and boolean filters with AND", async () => {
        console.log("\n🔍 Testing combined string + boolean filters...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                and: [
                    { Title: { contains: "TypeScript" } },
                    { IsPublished: { eq: true } },
                ],
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.every((post) =>
            post.title.toLowerCase().includes("typescript") && post.isPublished! === true
        )).toBe(true);
        console.log(`✅ Combined filters work - found ${entries.data.length} published TypeScript posts`);
    });

    it("should combine boolean and numeric filters with OR", async () => {
        console.log("\n🔍 Testing combined boolean + numeric filters with OR...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                or: [
                    { IsPublished: { eq: false } },
                    { ViewCount: { gte: 300 } },
                ],
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.every((post) =>
            post.isPublished! === false || post.viewCount! >= 300
        )).toBe(true);
        console.log(`✅ OR filtering works - found ${entries.data.length} posts (unpublished or high view count)`);
    });

    it("should handle complex nested conditions with multiple levels", async () => {
        console.log("\n🏗️  Testing complex nested filter conditions...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                and: [
                    { Title: { contains: "TypeScript" } },
                    {
                        or: [
                            { IsPublished: { eq: true } },
                            { ViewCount: { gte: 300 } },
                        ]
                    }
                ]
            },
        });

        expect(entries.data.every((post) => {
            const hasTypeScript = post.title.includes("TypeScript");
            const isPublishedOrHighViews = post.isPublished! === true || post.viewCount! >= 300;
            return hasTypeScript && isPublishedOrHighViews;
        })).toBe(true);

        console.log(`✅ Complex nested conditions work correctly - found ${entries.data.length} posts matching (Title contains "TypeScript" AND (Published OR ViewCount >= 300))`);
    });
});
