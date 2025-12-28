/**
 * Integration Tests - Entry Operations
 * 
 * Tests for:
 * - Creating entries
 * - Updating entries
 * - Getting entries
 * - References and relationships
 * - Image fields
 */

import { expect, test, describe } from "bun:test";
import { createClient } from "../../src";
import { AuthorContentType, CategoryContentType, BlogPostContentType } from "../decoupla.config";

const API_TOKEN = process.env.DECOUPLA_API_TOKEN;
const WORKSPACE = process.env.DECOUPLA_WORKSPACE;

if (!API_TOKEN || !WORKSPACE) {
    console.error('Missing DECOUPLA_API_TOKEN or DECOUPLA_WORKSPACE');
    process.exit(1);
}

describe("Entry Operations", () => {
    const config = createClient({
        apiToken: API_TOKEN,
        workspace: WORKSPACE
    });

    let createdAuthorId: string;
    let createdCategoryId: string;
    let createdPostId: string;
    let uploadedImageId: string;

    test("Should upload an image file", async () => {
        console.log('\n📤 Testing image upload...\n');

        // Create a minimal valid PNG (2x2 pixel)
        const createTestPNG = () => {
            const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
            const ihdr = Buffer.from([
                0x00, 0x00, 0x00, 0x0d,
                0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x02,
                0x00, 0x00, 0x00, 0x02,
                0x08, 0x02, 0x00, 0x00, 0x00,
                0x90, 0x77, 0x53, 0xde
            ]);
            const idat = Buffer.from([
                0x00, 0x00, 0x00, 0x19,
                0x49, 0x44, 0x41, 0x54,
                0x78, 0x9c, 0x62, 0xf8, 0x0f, 0x00, 0x00, 0x01,
                0x01, 0x00, 0x01, 0x18, 0xdd, 0x8d, 0xb4,
                0x00, 0x00, 0x00, 0x00,
                0x49, 0x45, 0x4e, 0x44,
                0xae, 0x42, 0x60, 0x82
            ]);
            return Buffer.concat([signature, ihdr, idat]);
        };

        const imageFile = new File([createTestPNG()], 'test-image.png', { type: 'image/png' });

        const result = await config.upload(imageFile);

        console.log(`✅ Image uploaded: ${result.id}`);
        console.log(`   Type: ${result.type}, Size: ${result.byte_size} bytes`);

        expect(result.id).toBeDefined();
        expect(result.type).toBe('image');
        expect(result.byte_size).toBeGreaterThan(0);

        uploadedImageId = result.id;
    });

    test("Should create an author entry", async () => {
        console.log('\n👤 Creating author entry...\n');

        const authorData = {
            Name: 'Jane Doe',
            Email: 'jane@example.com',
            Bio: 'Full-stack developer and tech writer'
        };

        try {
            const result = await config.createEntry(AuthorContentType, authorData);

            console.log(`✅ Author created: ${result.id}`);
            console.log(`   State: ${result.state}, Version: ${result.lastVersion}`);

            expect(result.id).toBeDefined();
            expect(result.state).toBe('active');

            createdAuthorId = result.id;
        } catch (error) {
            console.error('❌ Author creation failed:', error);
            throw error;
        }
    });

    test("Should create a category entry", async () => {
        console.log('\n🏷️  Creating category entry...\n');

        const categoryData = {
            Title: 'Technology',
            Description: 'Articles about software and technology'
        };

        try {
            const result = await config.createEntry(CategoryContentType, categoryData);

            console.log(`✅ Category created: ${result.id}`);
            console.log(`   State: ${result.state}, Version: ${result.lastVersion}`);

            expect(result.id).toBeDefined();
            expect(result.state).toBe('active');

            createdCategoryId = result.id;
        } catch (error) {
            console.error('❌ Category creation failed:', error);
            throw error;
        }
    });

    test("Should create a draft blog post (unpublished)", async () => {
        console.log('\n📝 Creating draft blog post (unpublished)...\n');

        if (!createdAuthorId || !uploadedImageId) {
            throw new Error('Required dependencies not created');
        }

        const postData = {
            Title: 'Getting Started with TypeScript',
            Content: 'TypeScript is a typed superset of JavaScript...',
            Excerpt: 'Learn TypeScript basics',
            FeaturedImage: uploadedImageId,
            Author: createdAuthorId,
            IsPublished: false,
            PublishedDate: '2025-12-23',
            ViewCount: 0,
        };

        try {
            // Step 1: Create unpublished (draft) entry - Version 1 unpublished
            const result = await config.createEntry(BlogPostContentType, postData, false);

            console.log(`✅ Draft blog post created: ${result.id}`);
            console.log(`   State: ${result.state}, Version: ${result.lastVersion}, Published Version: ${result.lastPublishedVersion}`);

            expect(result.id).toBeDefined();
            expect(result.state).toBe('active');
            expect(result.lastVersion).toBe(1);
            expect(result.lastPublishedVersion).toBeNull();  // Not published yet

            createdPostId = result.id;
        } catch (error) {
            console.error('❌ Draft blog post creation failed:', error);
            throw error;
        }
    });

    test("Should update draft without creating new version", async () => {
        console.log('\n📝 Updating draft entry (unpublished)...\n');

        if (!createdPostId) {
            throw new Error('Blog post ID not available');
        }

        const updateData = {
            Content: 'More polished content about TypeScript...',
        };

        try {
            // Step 2: Update unpublished draft - still Version 1 (updated in place)
            const result = await config.updateEntry(BlogPostContentType, createdPostId, updateData, false);

            console.log(`✅ Draft updated: ${result.id}`);
            console.log(`   Version: ${result.lastVersion}, Published Version: ${result.lastPublishedVersion}`);

            expect(result.id).toBe(createdPostId);
            expect(result.lastVersion).toBe(1);  // Still version 1, not incremented
            expect(result.lastPublishedVersion).toBeNull();  // Still not published
        } catch (error) {
            console.error('❌ Draft update failed:', error);
            throw error;
        }
    });

    test("Should publish the draft version", async () => {
        console.log('\n� Publishing draft blog post...\n');

        if (!createdPostId) {
            throw new Error('Blog post ID not available');
        }

        const publishData = {
            Title: 'Getting Started with TypeScript - Published',
        };

        try {
            // Step 3: Publish the draft - Version 1 becomes published
            const result = await config.updateEntry(BlogPostContentType, createdPostId, publishData, true);

            console.log(`✅ Blog post published: ${result.id}`);
            console.log(`   Version: ${result.lastVersion}, Published Version: ${result.lastPublishedVersion}`);

            expect(result.id).toBe(createdPostId);
            expect(result.lastVersion).toBe(1);
            expect(result.lastPublishedVersion).toBe(1);  // Now published
        } catch (error) {
            console.error('❌ Publishing failed:', error);
            throw error;
        }
    });

    test("Should update published entry to create new draft version", async () => {
        console.log('\n📝 Updating published entry to create draft...\n');

        if (!createdPostId) {
            throw new Error('Blog post ID not available');
        }

        const updateData = {
            ViewCount: 42,
        };

        try {
            // Step 4: Edit published entry - Version 2 (unpublished draft for next publication)
            const result = await config.updateEntry(BlogPostContentType, createdPostId, updateData, false);

            console.log(`✅ New draft version created: ${result.id}`);
            console.log(`   Version: ${result.lastVersion}, Published Version: ${result.lastPublishedVersion}`);

            expect(result.id).toBe(createdPostId);
            expect(result.lastVersion).toBe(2);  // New draft version created
            expect(result.lastPublishedVersion).toBe(1);  // Published version still 1
        } catch (error) {
            console.error('❌ Draft creation failed:', error);
            throw error;
        }
    });

    test("Should retrieve blog post entry with relations", async () => {
        console.log('\n🔍 Retrieving blog post entry...\n');

        if (!createdPostId) {
            throw new Error('Blog post ID not available');
        }

        try {
            const result = await config.getEntry(BlogPostContentType, createdPostId, {
                preload: ['Author']
            });

            console.log(`✅ Blog post retrieved: ${result.data.id}`);
            console.log(`   State: ${result.data.state}`);
            console.log(`   Version: ${result.data.lastVersion}, Published Version: ${result.data.lastPublishedVersion}`);
            console.log(`   Versions array present: ${Array.isArray((result.data as any).versions)}`);

            expect(result.data.id).toBe(createdPostId);
            expect(result.data.state).toBeDefined();
            expect(result.data.lastVersion).toBe(2);
            expect(result.data.lastPublishedVersion).toBe(1);
            expect(Array.isArray((result.data as any).versions)).toBe(true);
        } catch (error) {
            console.error('❌ Retrieval failed:', error);
            throw error;
        }
    });
});
