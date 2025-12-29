import { z } from "zod";
import type { ImageObject, TextObject } from "../types";

// Utility functions for case conversion between snake_case and camelCase
export function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToSnake(str: string): string {
    // Convert camelCase or PascalCase to snake_case.
    // Preserve first-letter lowercase for single-word PascalCase (Title -> title)
    return str.replace(/([A-Z])/g, (match, _p1, offset) => {
        return offset === 0 ? match.toLowerCase() : `_${match.toLowerCase()}`;
    });
}

export const initSchema = z.object({
    apiToken: z.string().min(1, "API Token is required"),
    workspace: z.string().min(1, "Workspace is required"),
});

export type InitSchema = z.infer<typeof initSchema>;

const preloadType: z.ZodTypeAny = z.lazy(() =>
    z.array(
        z.union([
            z.string(),
            z.tuple([z.string(), preloadType])
        ])
    )
);

export const requestSchema = z.object({
    type: z.string().optional(),
    op_type: z.enum(['get_entry', 'get_entries', 'inspect']),
    // Which API surface to target when fetching entries. Defaults to 'live' in the client.
    api_type: z.enum(['live', 'preview']).optional(),
    // entry_id is required for get_entry operations (top-level param)
    entry_id: z.string().optional(),
    filters: z.any().optional(),
    preload: preloadType.optional(),
    sort: z.array(z.tuple([z.string(), z.enum(['ASC', 'DESC'])])).optional(),
    limit: z.number().int().min(1).optional(),
    offset: z.number().int().min(0).optional(),
})

export type RequestSchema = z.infer<typeof requestSchema>;

// --- Content Type Schema Builder ---
// Allows you to define content types with Zod and automatically infer TypeScript types

// Base field types (non-reference)
export type FieldSchemaConfig =
    | { type: 'string'; required?: boolean; options?: readonly string[]; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'string[]'; required?: boolean; options?: readonly string[]; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'text'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'slug'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'int'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'int[]'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'float'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'float[]'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'boolean'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'boolean[]'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'date'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'time'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'datetime'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'json'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'image'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'image[]'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'video'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'video[]'; required?: boolean; isLabel?: boolean; schema?: z.ZodTypeAny }
    | { type: 'reference'; required?: boolean; isLabel?: boolean; references?: readonly (string | Record<string, FieldSchemaConfig> | { __fields: Record<string, FieldSchemaConfig> })[]; schema?: z.ZodTypeAny }
    | { type: 'reference[]'; required?: boolean; isLabel?: boolean; references?: readonly (string | Record<string, FieldSchemaConfig> | { __fields: Record<string, FieldSchemaConfig> })[]; schema?: z.ZodTypeAny };

// Helper type to extract all valid field type strings from FieldSchemaConfig
export type FieldType = FieldSchemaConfig extends { type: infer T } ? T : never;

// Helper to infer type from a field config
// This directly computes the TypeScript type without needing a separate registry
type InferFieldType<T extends FieldSchemaConfig> =
    T extends { type: 'string'; options: readonly (infer Opt)[] }
    ? Opt
    : T extends { type: 'string' }
    ? string
    : T extends { type: 'string[]'; options: readonly (infer Opt)[] }
    ? Opt[]
    : T extends { type: 'string[]' }
    ? string[]
    : T extends { type: 'text' } ? TextObject
    : T extends { type: 'slug' } ? string
    : T extends { type: 'int' } ? number
    : T extends { type: 'int[]' } ? number[]
    : T extends { type: 'float' } ? number
    : T extends { type: 'float[]' } ? number[]
    : T extends { type: 'boolean' } ? boolean
    : T extends { type: 'boolean[]' } ? boolean[]
    : T extends { type: 'date' } ? string // ISO 8601 date string
    : T extends { type: 'time' } ? string // ISO 8601 time string
    : T extends { type: 'datetime' } ? string // ISO 8601 datetime string
    : T extends { type: 'json' } ? unknown // Any valid JSON value
    : T extends { type: 'image' } ? ImageObject
    : T extends { type: 'image[]' } ? ImageObject[]
    : T extends { type: 'video' } ? string
    : T extends { type: 'video[]' } ? string[]
    : T extends { type: 'reference'; references: readonly (infer Ref)[] }
    ? Ref extends string
    ? string | Record<string, any> // String references resolve to generic types
    : Ref extends { __fields: infer Fields }
    ? Fields extends Record<string, FieldSchemaConfig>
    ? Omit<ContentTypeFromConfig<Fields>, never>
    : string | Record<string, any>
    : Ref extends Record<string, FieldSchemaConfig>
    ? Omit<ContentTypeFromConfig<Ref>, never>
    : string | Record<string, any>
    : T extends { type: 'reference[]'; references: readonly (infer Ref)[] }
    ? Ref extends string
    ? (string | Record<string, any>)[]
    : Ref extends { __fields: infer Fields }
    ? Fields extends Record<string, FieldSchemaConfig>
    ? Omit<ContentTypeFromConfig<Fields>, never>[]
    : (string | Record<string, any>)[]
    : Ref extends Record<string, FieldSchemaConfig>
    ? Omit<ContentTypeFromConfig<Ref>, never>[]
    : (string | Record<string, any>)[]
    : never;

// Helper to determine if a field is required
type IsRequired<T extends FieldSchemaConfig> = T extends { required: true } ? true : false;

// Helper to transform a single field into its proper type
type TransformField<T extends FieldSchemaConfig> =
    IsRequired<T> extends true
    ? InferFieldType<T>
    : InferFieldType<T> | undefined;

// Main type transformer that builds an object type from field configs
export type ContentTypeFromConfig<T extends Record<string, FieldSchemaConfig>> = {
    [K in keyof T]: TransformField<T[K]>;
};

// Helper type to extract fields from a content type definition object
export type ExtractFields<T> = T extends { __fields: infer F } ? F : never;

// Helper type to infer the TypeScript type from a content type definition object
// Usage: type User = InferContentType<typeof userDefinition>;
export type InferContentType<T extends { __fields: Record<string, FieldSchemaConfig> }> = Omit<ContentTypeFromConfig<T['__fields']>, never>;

export type ContentTypeSchemaConfig = {
    fields: Record<string, FieldSchemaConfig>;
};

/**
 * Helper function to build a Zod schema for a field based on its config.
 * If a custom schema is provided, it uses that; otherwise, infers from the type.
 */
export const fieldSchemaBuilder = (config: FieldSchemaConfig): z.ZodTypeAny => {
    if (config.schema) {
        return config.required ? config.schema : config.schema.optional();
    }

    let baseSchema: z.ZodTypeAny;

    switch (config.type) {
        case 'string':
            baseSchema = (config as any).options ? z.enum((config as any).options as [string, ...string[]]) : z.string();
            break;
        case 'string[]':
            baseSchema = (config as any).options ? z.array(z.enum((config as any).options as [string, ...string[]])) : z.array(z.string());
            break;
        case 'text':
            baseSchema = z.string();
            break;
        case 'slug':
            baseSchema = z.string();
            break;
        case 'int':
            baseSchema = z.number().int();
            break;
        case 'int[]':
            baseSchema = z.array(z.number().int());
            break;
        case 'float':
            baseSchema = z.number();
            break;
        case 'float[]':
            baseSchema = z.array(z.number());
            break;
        case 'image':
            baseSchema = z.string(); // typically a URL or ID
            break;
        case 'image[]':
            baseSchema = z.array(z.string());
            break;
        case 'video':
            baseSchema = z.string();
            break;
        case 'video[]':
            baseSchema = z.array(z.string());
            break;
        case 'boolean':
            baseSchema = z.boolean();
            break;
        case 'boolean[]':
            baseSchema = z.array(z.boolean());
            break;
        case 'date':
            baseSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
            break;
        case 'time':
            baseSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format (HH:MM:SS)');
            break;
        case 'datetime':
            baseSchema = z.string().datetime('Invalid datetime format (ISO 8601)');
            break;
        case 'json':
            baseSchema = z.any(); // Accept any valid JSON value
            break;
        case 'reference':
            // reference fields typically contain an ID or object reference
            baseSchema = z.union([z.string(), z.record(z.string(), z.any())]);
            break;
        case 'reference[]':
            baseSchema = z.array(z.union([z.string(), z.record(z.string(), z.any())]));
            break;
        default:
            baseSchema = z.any();
    }

    return config.required ? baseSchema : baseSchema.optional();
};

/**
 * Build a Zod object schema from a content type config with proper type preservation.
 * 
 * Usage:
 *   type Author = Omit<ContentTypeFromConfig<typeof authorConfig>, never>;
 *   type Article = Omit<ContentTypeFromConfig<typeof articleConfig>, never>;
 *   
 *   const authorSchema = createContentTypeSchema({ fields: authorConfig });
 *   const articleSchema = createContentTypeSchema({ fields: articleConfig });
 */
export const createContentTypeSchema = <T extends Record<string, FieldSchemaConfig>>(
    config: { fields: T }
): z.ZodType<ContentTypeFromConfig<T>> => {
    const fields: Record<string, z.ZodTypeAny> = {};

    for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
        fields[fieldName] = fieldSchemaBuilder(fieldConfig as FieldSchemaConfig);
    }

    return z.object(fields) as z.ZodType<ContentTypeFromConfig<T>>;
};