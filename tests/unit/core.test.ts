/**
 * Core Functionality Tests
 * 
 * Tests for:
 * - Config initialization
 * - Content type definition
 * - Field type validation
 */

import { expect, test, describe } from "bun:test";
import { createClient, defineContentType } from "../../src";

describe("Core Functionality", () => {
    test("Should create config with valid credentials", () => {
        const config = createClient({
            apiToken: "test-token",
            workspace: "test-workspace-id"
        });

        expect(config).toBeDefined();
        expect(config.createEntry).toBeDefined();
        expect(config.updateEntry).toBeDefined();
        expect(config.getEntry).toBeDefined();
        expect(config.upload).toBeDefined();
    });

    test("Should define content types with all field types", () => {
        const BlogPost = defineContentType({
            name: 'blog_post',
            displayName: 'Blog Post',
            description: 'A blog post with all field types',
            fields: {
                title: { type: 'string', required: true, isLabel: true },
                content: { type: 'text', required: true },
                excerpt: { type: 'string', required: false },
                author: { type: 'reference', required: false },
                categories: { type: 'reference[]', required: false },
                tags: { type: 'string[]', required: false },
                featuredImage: { type: 'image', required: false },
                gallery: { type: 'image[]', required: false },
                isPublished: { type: 'boolean', required: false },
                viewCount: { type: 'int', required: false },
                rating: { type: 'float', required: false },
                metadata: { type: 'json', required: false },
            }
        });

        expect(BlogPost.__definition.name).toBe('blog_post');
        expect(BlogPost.__definition.displayName).toBe('Blog Post');
        expect(BlogPost.__fields).toBeDefined();
        expect(Object.keys(BlogPost.__fields).length).toBe(12);
    });

    test("Should validate field types correctly", () => {
        const Product = defineContentType({
            name: 'product',
            displayName: 'Product',
            fields: {
                name: { type: 'string', required: true },
                price: { type: 'float', required: true },
                inStock: { type: 'boolean', required: true },
                images: { type: 'image[]', required: false },
            }
        });

        expect(Product.__fields.name.type).toBe('string');
        expect(Product.__fields.price.type).toBe('float');
        expect(Product.__fields.inStock.type).toBe('boolean');
        expect(Product.__fields.images.type).toBe('image[]');
    });
});
