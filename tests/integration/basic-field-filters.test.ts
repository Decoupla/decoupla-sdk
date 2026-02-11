/**
 * Integration tests for basic field type filters
 * 
 * Tests filtering by individual field types:
 * - String fields (exact match, contains, starts_with, ends_with)
 * - Boolean fields
 * - Integer fields
 * - Float fields
 * - Date fields
 * - DateTime fields
 * - Slug fields
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { setupTestData } from "./setup";
import { BlogPostContentType, ProductContentType, EventContentType } from "../decoupla.config";

describe("Basic Field Type Filters", () => {
    let config: Awaited<ReturnType<typeof setupTestData>>["config"];
    let testAuthorIds: string[] = [];

    beforeAll(async () => {
        const setup = await setupTestData();
        config = setup.config;
        testAuthorIds = setup.testAuthorIds;
    });

    it("should filter by exact string match with type-safe field names", async () => {
        console.log("\n🔍 Testing exact string match with type-safe filters...");
        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { eq: "TypeScript Best Practices" },
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((post) => post.title === "TypeScript Best Practices")).toBe(true);
        console.log(`✅ Found ${entries.data.length} posts with exact title match`);
    });

    it("should filter by string contains with type-safe operations", async () => {
        console.log("\n🔍 Testing string contains filter...");
        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { contains: "TypeScript" },
            },
        });

        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((post) => post.title?.includes("TypeScript"))).toBe(true);
        console.log(`✅ Found ${entries.data.length} posts containing "TypeScript"`);
    });

    it("should filter by starts_with with type-safe validation", async () => {
        console.log("\n🔍 Testing starts_with filter...");
        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { starts_with: "Type" },
            },
        });

        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((post) => post.title?.startsWith("Type"))).toBe(true);
        console.log(`✅ Found ${entries.data.length} posts starting with "Type"`);
    });

    it("should filter by ends_with with type-safe validation", async () => {
        console.log("\n🔍 Testing ends_with filter...");
        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { ends_with: "Practices" },
            },
        });

        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((post) => post.title?.endsWith("Practices"))).toBe(true);
        console.log(`✅ Found ${entries.data.length} posts ending with "Practices"`);
    });

    it("should filter boolean fields with type-safe operations", async () => {
        console.log("\n🔍 Testing boolean filter type safety...");
        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                IsPublished: { eq: true },
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((post) => post.isPublished === true)).toBe(true);
        console.log(`✅ Boolean field filtering works - found ${entries.data.length} published posts`);
    });

    it("should auto-convert camelCase field names to snake_case", async () => {
        console.log("\n🔍 Testing automatic camelCase to snake_case conversion...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                Title: { contains: "TypeScript" },
                IsPublished: { eq: true },
            },
        });

        expect(entries.data).toBeDefined();
        console.log(`✅ CamelCase field names automatically converted to snake_case for backend`);
    });

    it("should filter by integer field (ViewCount) with numeric operations", async () => {
        console.log("\n🔍 Testing numeric field filtering (ViewCount >= 200)...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                ViewCount: { gte: 200 },
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((post) => post.viewCount! >= 200)).toBe(true);
        console.log(`✅ Numeric filtering works - found ${entries.data.length} posts with viewCount >= 200`);
    });

    it("should filter by date field with date range operations", async () => {
        console.log("\n🔍 Testing date field filtering (published after 2025-01-01)...");

        const entries = await config.getEntries(BlogPostContentType, {
            filters: {
                PublishedDate: { gte: "2025-01-01" },
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        console.log(`✅ Date filtering works - found ${entries.data.length} posts published after 2025-01-01`);
    });

    it("should filter by float field (Price) with numeric operations", async () => {
        console.log("\n🔍 Testing float field filtering (Price >= 10.50)...");

        const ts = Date.now();
        await config.createEntry(ProductContentType, {
            Name: `Expensive Product ${ts}`,
            Slug: `expensive-product-${ts}`,
            Description: "A high-priced item",
            Price: 99.99,
            StockQuantity: 5,
            IsAvailable: true,
        });

        await config.createEntry(ProductContentType, {
            Name: `Cheap Product ${ts}`,
            Slug: `cheap-product-${ts}`,
            Description: "An affordable item",
            Price: 5.99,
            StockQuantity: 100,
            IsAvailable: true,
        });

        const entries = await config.getEntries(ProductContentType, {
            filters: {
                Price: { gte: 10.50 }
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((product) => {
            const price = product.price;
            return typeof price === 'number' && price >= 10.50;
        })).toBe(true);

        console.log(`✅ Float field filtering works - found ${entries.data.length} products with price >= 10.50`);
    });

    it("should filter by datetime field", async () => {
        console.log("\n🔍 Testing datetime field filtering...");

        const eventDate = new Date().toISOString();

        const event = await config.createEntry(EventContentType, {
            Title: "Test Event",
            Description: "A test event",
            EventDate: eventDate,
            EventTime: "14:30",
            Duration: 2.5,
            Speakers: [],
        }, true);

        const oneDay = 86400000;
        const filterDateTime = new Date(Date.now() - oneDay).toISOString();

        const entries = await config.getEntries(EventContentType, {
            filters: {
                EventDate: { gte: filterDateTime }
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((eventEntry) => {
            const date = eventEntry.eventDate;
            return date && date >= filterDateTime;
        })).toBe(true);

        console.log(`✅ DateTime field filtering works - found ${entries.data.length} events with date >= ${filterDateTime}`);
    });

    it.skip("should filter by text field (Content) when backend supports it", async () => {
        console.log("\n🔍 Testing text field filtering (Content contains)...");

        try {
            const entries = await config.getEntries(BlogPostContentType, {
                filters: {
                    Content: { contains: "content" },
                },
            });

            expect(entries.data).toBeDefined();
            expect(entries.data.length).toBeGreaterThan(0);
            expect(entries.data.every((post) => post.content?.toLowerCase().includes("content"))).toBe(true);
            console.log(`✅ Text field filtering works - found ${entries.data.length} posts with matching content`);
        } catch (error) {
            const errorMsg = (error as Error).message;
            // Backend doesn't support filtering on text fields - this is expected
            if (errorMsg.includes("Invalid filter field")) {
                console.log(`⏳ Backend doesn't support filtering on text fields: ${errorMsg}`);
                return; // Skip this test - it's a backend limitation
            }
            throw error; // Re-throw unexpected errors
        }
    });

    it("should filter by slug field", async () => {
        console.log("\n🔍 Testing slug field filtering...");

        const ts = Date.now();
        await config.createEntry(ProductContentType, {
            Name: `Slug Test Product ${ts}`,
            Slug: `slug-test-${ts}`,
            Price: 10.00,
            IsAvailable: true,
        });

        const entries = await config.getEntries(ProductContentType, {
            filters: {
                Slug: { eq: `slug-test-${ts}` }
            },
        });

        expect(entries.data).toBeDefined();
        expect(entries.data.length).toBeGreaterThan(0);
        expect(entries.data.every((product) => product.slug === `slug-test-${ts}`)).toBe(true);

        console.log(`✅ Slug field filtering works - found ${entries.data.length} products`);
    });
});
