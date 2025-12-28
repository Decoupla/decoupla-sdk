/**
 * Test Configuration for Decoupla
 * 
 * This is an example of how users will create their decoupla.config.ts file.
 * 
 * They define content types using defineContentType, then wrap them in defineConfig
 * with their workspace ID, API token, and content types array.
 * 
 * The CLI will read this default export and sync the content types with the backend.
 */

import { defineContentType, defineConfig } from "../src/types";

// ============================================
// CONTENT TYPE DEFINITIONS
// ============================================


export const AuthorContentType = defineContentType({
    name: 'author',
    displayName: 'Author',
    description: 'Blog post authors',
    fields: {
        Name: { type: 'string' as const, required: true, isLabel: true },
        Email: { type: 'string' as const, required: false },
        Bio: { type: 'text' as const, required: false },
    }
});

export const CategoryContentType = defineContentType({
    name: 'category',
    displayName: 'Category',
    description: 'Blog post categories',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
        Description: { type: 'text' as const, required: false },
    }
});

export const BlogPostContentType = defineContentType({
    name: 'blog_post',
    displayName: 'BlogPost',
    description: 'Blog posts with all field types',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
        Content: { type: 'text' as const, required: true },
        Excerpt: { type: 'string' as const, required: false },
        FeaturedImage: { type: 'image' as const, required: false },
        Author: {
            type: 'reference' as const,
            required: false,
            references: [AuthorContentType]
        },
        IsPublished: { type: 'boolean' as const, required: false },
        PublishedDate: { type: 'date' as const, required: false },
        ViewCount: { type: 'int' as const, required: false },
    }
});

export const ProductContentType = defineContentType({
    name: 'product',
    displayName: 'Product',
    description: 'E-commerce products with float and slug fields',
    fields: {
        Name: { type: 'string' as const, required: true, isLabel: true },
        Slug: { type: 'slug' as const, required: false },
        Description: { type: 'text' as const, required: false },
        Price: { type: 'float' as const, required: false },
        StockQuantity: { type: 'int' as const, required: false },
        IsAvailable: { type: 'boolean' as const, required: false },
    }
});

export const EventContentType = defineContentType({
    name: 'event',
    displayName: 'Event',
    description: 'Events with datetime and time fields',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
        Description: { type: 'text' as const, required: false },
        EventDate: { type: 'datetime' as const, required: false },
        EventTime: { type: 'time' as const, required: false },
        Duration: { type: 'float' as const, required: false },
        Speakers: {
            type: 'reference[]' as const,
            required: false,
            references: [AuthorContentType]
        },
    }
});

export const ReviewContentType = defineContentType({
    name: 'review',
    displayName: 'Review',
    description: 'Product reviews with string arrays',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
        Rating: { type: 'float' as const, required: false },
        Content: { type: 'text' as const, required: false },
        ReviewDate: { type: 'date' as const, required: false },
        Product: {
            type: 'reference' as const,
            required: false,
            references: [ProductContentType]
        },
        IsApproved: { type: 'boolean' as const, required: false },
        Tags: { type: 'string[]' as const, required: false },
    }
});

export const CommentContentType = defineContentType({
    name: 'comment',
    displayName: 'Comment',
    description: 'Comments on any content',
    fields: {
        Content: { type: 'string' as const, required: true, isLabel: true },
        Author: { type: 'string' as const, required: false },
        CreatedDate: { type: 'date' as const, required: false },
    }
});

/**
 * Polymorphic reference example:
 * References multiple content types (Author, Product, Review)
 * Can filter by any of the referenced types
 */
export const ContentMentionContentType = defineContentType({
    name: 'content_mention',
    displayName: 'Content Mention',
    description: 'References that can point to multiple content types (polymorphic)',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
        Description: { type: 'text' as const, required: false },
        // Single polymorphic reference - can reference Author, Product, or Review
        ReferencedContent: {
            type: 'reference' as const,
            required: false,
            references: [AuthorContentType, ProductContentType, ReviewContentType]
        },
        // Array of polymorphic references
        RelatedContent: {
            type: 'reference[]' as const,
            required: false,
            references: [AuthorContentType, ProductContentType, ReviewContentType, CommentContentType]
        },
    }
});

export const LevelThreeContentType = defineContentType({
    name: 'level_three',
    displayName: 'LevelThree',
    description: 'Deep nested level 3',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
    }
});

export const LevelTwoContentType = defineContentType({
    name: 'level_two',
    displayName: 'LevelTwo',
    description: 'Deep nested level 2 referencing level 3',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
        Child: {
            type: 'reference' as const,
            required: false,
            references: [LevelThreeContentType]
        }
    }
});

export const LevelOneContentType = defineContentType({
    name: 'level_one',
    displayName: 'LevelOne',
    description: 'Deep nested level 1 referencing level 2',
    fields: {
        Title: { type: 'string' as const, required: true, isLabel: true },
        Child: {
            type: 'reference' as const,
            required: false,
            references: [LevelTwoContentType]
        }
    }
});

// ============================================
// DEFAULT EXPORT: Configuration Schema
// ============================================

/**
 * Configuration exported via defineConfig
 * 
 * This is what the CLI tool reads and uses to sync content types with the backend.
 * The default export contains:
 * - workspace: The workspace ID
 * - apiToken: The API token for authentication
 * - contentTypes: Array of content types to sync
 */
export default defineConfig({
    workspace: process.env.DECOUPLA_WORKSPACE || 'test-workspace',
    apiToken: process.env.DECOUPLA_API_TOKEN || 'test-token',
    contentTypes: [
        AuthorContentType,
        CategoryContentType,
        BlogPostContentType,
        ProductContentType,
        EventContentType,
        ReviewContentType,
        CommentContentType,
        ContentMentionContentType,
        LevelThreeContentType,
        LevelTwoContentType,
        LevelOneContentType,
    ],
});


