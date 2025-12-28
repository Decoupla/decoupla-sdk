/**
 * Content Type Definition Utilities
 * 
 * This module provides defineContentType and defineConfig utilities.
 * Type checking is done through the BrandedContentType returned by defineContentType,
 * rather than relying on generic type parameters in API functions.
 */

import type { FieldDefinition, ContentTypeDefinition } from './index';

// ============================================
// CONTENT TYPE DEFINITION
// ============================================

/**
 * Branded content type definition with field information
 * Used by defineContentType to preserve schema information that can be
 * extracted and used by API operations for type safety
 */
export type BrandedContentType<T extends Record<string, FieldDefinition> = Record<string, FieldDefinition>> = {
    __definition: ContentTypeDefinition;
    __fields: T;
    __isContentTypeDefinition: true;
};

/**
 * Extract field schema from content type
 */
export type ExtractFieldSchema<T extends BrandedContentType<any>> = T['__fields'];

// ============================================
// CONTENT TYPE DEFINITION HELPER
// ============================================

/**
 * Define a content type with full type safety and field preservation
 * 
 * Used in config files to define content types. The returned object
 * carries type information that API operations can use for type checking.
 * 
 * @example
 *   export const AuthorContentType = defineContentType({
 *       name: 'author',
 *       displayName: 'Author',
 *       description: 'Blog post authors',
 *       fields: {
 *           name: { type: 'string', required: true },
 *           email: { type: 'string', required: false },
 *       } as const,
 *   });
 *   
 *   // Usage in API:
 *   const author = await config.createEntry(AuthorContentType, {
 *       name: 'John Doe',
 *       email: 'john@example.com',
 *   });
 */
export function defineContentType<T extends Record<string, FieldDefinition>>(config: {
    name: string;
    displayName?: string;
    description?: string;
    fields: T;
}): BrandedContentType<T> {
    return {
        __definition: {
            name: config.name,
            displayName: config.displayName,
            description: config.description,
            fields: config.fields,
        },
        __fields: config.fields,
        __isContentTypeDefinition: true,
    };
}

// ============================================
// CONFIG CREATION TYPE
// ============================================

/**
 * Type-safe configuration definition helper
 * Creates a config object that can be exported from decoupla.config.ts
 * The CLI tools will import and read this config to get credentials and content types
 * 
 * @example
 *   export default defineConfig({
 *       workspace: 'my-workspace-id',
 *       apiToken: 'my-api-token',
 *       contentTypes: [BlogPostContentType, AuthorContentType],
 *   });
 */
export function defineConfig(config: {
    workspace: string;
    apiToken: string;
    contentTypes: Array<BrandedContentType<any>>;
}): typeof config {
    return config;
}
