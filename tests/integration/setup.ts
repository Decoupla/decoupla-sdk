/**
 * Shared test setup and data generation for filter integration tests
 */

import { createClient } from "../../src";
import {
    AuthorContentType,
    BlogPostContentType,
} from "../decoupla.config";

export async function setupTestData() {
    const config = createClient({
        apiToken: process.env.DECOUPLA_API_TOKEN || "",
        workspace: process.env.DECOUPLA_WORKSPACE || "",
    });

    console.log("\n📦 Setting up comprehensive test data...");

    // Create test authors
    console.log("Creating test authors...");
    const authors = [
        { Name: "Alice Johnson", Email: "alice@example.com", Bio: "Senior full-stack developer" },
        { Name: "Bob Smith", Email: "bob@example.com", Bio: "Frontend specialist" },
        { Name: "Carol Williams", Email: "carol@example.com", Bio: "DevOps engineer" },
    ];

    const testAuthorIds: string[] = [];
    for (const author of authors) {
        try {
            const result = await config.createEntry(AuthorContentType, author, true);
            testAuthorIds.push(result.id);
            console.log(`✅ Created author: ${author.Name}`);
        } catch (error) {
            console.log(`⚠️  Could not create author ${author.Name}:`, (error as Error).message);
        }
    }

    // Create comprehensive test blog posts with various field values
    console.log("Creating comprehensive test blog posts...");
    const postTemplates = [
        {
            Title: "TypeScript Best Practices",
            Excerpt: "Learn the best practices for TypeScript development",
            Content: "Detailed content about TypeScript best practices...",
            IsPublished: true,
            PublishedDate: "2025-01-15",
            ViewCount: 150,
            AuthorIndex: 0,
        },
        {
            Title: "TypeScript Advanced Patterns",
            Excerpt: "Deep dive into advanced TypeScript patterns",
            Content: "Advanced patterns content...",
            IsPublished: true,
            PublishedDate: "2025-01-10",
            ViewCount: 200,
            AuthorIndex: 0,
        },
        {
            Title: "Type Safety in TypeScript",
            Excerpt: "Understanding type safety",
            Content: "Type safety content...",
            IsPublished: true,
            PublishedDate: "2025-01-05",
            ViewCount: 300,
            AuthorIndex: 1,
        },
        {
            Title: "React Hooks Guide",
            Excerpt: "Comprehensive guide to React Hooks",
            Content: "React Hooks guide content...",
            IsPublished: true,
            PublishedDate: "2024-12-20",
            ViewCount: 450,
            AuthorIndex: 1,
        },
        {
            Title: "Vue 3 Composition API",
            Excerpt: "Mastering Vue 3 Composition API",
            Content: "Vue 3 content...",
            IsPublished: true,
            PublishedDate: "2024-12-10",
            ViewCount: 180,
            AuthorIndex: 2,
        },
        {
            Title: "Draft: TypeScript Generics",
            Excerpt: "Understanding generics in TypeScript",
            Content: "Generics content...",
            IsPublished: false,
            PublishedDate: "2025-02-01",
            ViewCount: 0,
            AuthorIndex: 0,
        },
        {
            Title: "Draft: Docker Deployment",
            Excerpt: "Docker best practices for production",
            Content: "Docker content...",
            IsPublished: false,
            PublishedDate: "2025-02-15",
            ViewCount: 0,
            AuthorIndex: 2,
        },
    ];

    for (const template of postTemplates) {
        try {
            const post: any = { ...template };
            const authorIndex = post.AuthorIndex;
            delete post.AuthorIndex;
            if (testAuthorIds.length > authorIndex) {
                post.Author = testAuthorIds[authorIndex];
            }
            await config.createEntry(BlogPostContentType, post, template.IsPublished);
            console.log(`✅ Created blog post: ${template.Title}`);
        } catch (error) {
            console.log(`⚠️  Could not create blog post "${template.Title}":`, (error as Error).message);
        }
    }

    console.log("✅ Test data setup complete!\n");
    return { config, testAuthorIds };
}
