/**
 * Type-safe filter system for content type queries
 * 
 * Provides compile-time validation of filter operations based on field types.
 * Supports complex filters with and/or logic and list operations.
 * Supports polymorphic reference fields - can filter by any of the referenced types.
 * 
 * Filter Structure:
 * - and: Filter[] - all conditions must be true
 * - or: Filter[] - any condition can be true
 * - Field filters: depend on field type
 *   - string/slug: is_null, is_not_null, eq, not_eq, contains, not_contains, starts_with, not_starts_with, ends_with, not_ends_with, in, not_in
 *   - text: same as string
 *   - boolean: is_null, is_not_null, eq, not_eq
 *   - id: eq, not_eq, in, not_in
 *   - date/datetime/time: is_null, is_not_null, eq, not_eq, gt, gte, lt, lte, between, outside
 *   - int/float: is_null, is_not_null, eq, not_eq, gt, gte, lt, lte, between, outside, in, not_in
 *   - lists (except image[] and video[]): none<Filter>, any<Filter>, every<Filter>
 *   - reference/reference[]: filters for each referenced type using {field}_{type}_filter naming
 *     Can filter by any of the referenced content types or use union filter syntax
 */

import type { FieldDefinition, ContentTypeDefinition } from "../types";

// Null check operations (valid for all field types)
type NullOperations = 'is_null' | 'is_not_null';

// String/Slug/Text operations
type StringOperations = NullOperations | 'eq' | 'not_eq' | 'contains' | 'not_contains' | 'starts_with' | 'not_starts_with' | 'ends_with' | 'not_ends_with' | 'in' | 'not_in';

// Boolean operations
type BooleanOperations = NullOperations | 'eq' | 'not_eq';

// ID operations
type IdOperations = 'eq' | 'not_eq' | 'in' | 'not_in';

// Numeric operations (int, float)
type NumericOperations = NullOperations | 'eq' | 'not_eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'outside' | 'in' | 'not_in';

// Date/Time operations
type DateTimeOperations = NullOperations | 'eq' | 'not_eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'outside';

// Reference operations
type ReferenceOperations = 'eq' | 'not_eq' | 'in' | 'not_in';

// List operations - work on individual items in the list
type ListOperations<T extends Filter> = {
    none: T;
    any: T;
    every: T;
};

// Map field types to their allowed operations
type FieldTypeOperations = {
    'id': IdOperations;
    'string': StringOperations;
    'text': StringOperations;
    'slug': StringOperations;
    'int': NumericOperations;
    'float': NumericOperations;
    'boolean': BooleanOperations;
    'date': DateTimeOperations;
    'time': DateTimeOperations;
    'datetime': DateTimeOperations;
    'reference': ReferenceOperations;
    'string[]': ListOperations<Filter>;
    'int[]': ListOperations<Filter>;
    'float[]': ListOperations<Filter>;
    'boolean[]': ListOperations<Filter>;
    'date[]': ListOperations<Filter>;
    'reference[]': ListOperations<Filter>;
    'image': never; // Images cannot be filtered
    'video': never; // Videos cannot be filtered
    'image[]': never; // Image arrays cannot be filtered
    'video[]': never; // Video arrays cannot be filtered
    'json': never; // JSON cannot be filtered
};

// Value type for each field type
type FieldTypeValue = {
    'id': string | string[];
    'string': string | string[];
    'text': string | string[];
    'slug': string | string[];
    'int': number | number[];
    'float': number | number[];
    'boolean': boolean;
    'date': string | [string, string]; // ISO date string or [from, to] for between/outside
    'time': string | [string, string];
    'datetime': string | [string, string];
    'reference': string | string[];
    'string[]': never;
    'int[]': never;
    'float[]': never;
    'boolean[]': never;
    'date[]': never;
    'reference[]': never;
    'image': never;
    'video': never;
    'image[]': never;
    'video[]': never;
    'json': never;
};

// Forward declare Filter type for recursive definition
/**
 * A filter object that can contain:
 * - and: Filter[] - all conditions must be true
 * - or: Filter[] - any condition can be true
 * - Field-specific filters: depends on the field type
 */
type Filter = {
    and?: Filter[];
    or?: Filter[];
    [fieldName: string]: any;
};

/**
 * Helper type to get the operations for a specific field type
 */
type OperationsForFieldType<TFieldType extends keyof FieldTypeOperations> =
    TFieldType extends keyof FieldTypeOperations
    ? FieldTypeOperations[TFieldType]
    : never;

/**
 * Helper type to get the value for a specific field type
 */
type ValueForFieldType<TFieldType extends keyof FieldTypeValue> =
    TFieldType extends keyof FieldTypeValue
    ? FieldTypeValue[TFieldType]
    : never;

/**
 * Build a field-specific filter based on field type
 * TFieldDef is optional and used for reference fields to provide type safety for nested filters
 */
type FieldFilter<TFieldType extends keyof FieldTypeOperations, TFieldDef extends FieldDefinition = any> =
    TFieldType extends 'string[]' | 'int[]' | 'float[]' | 'boolean[]' | 'date[]' | 'reference[]'
    ? {
        none?: ListItemFilter<TFieldType, TFieldDef>;
        any?: ListItemFilter<TFieldType, TFieldDef>;
        every?: ListItemFilter<TFieldType, TFieldDef>;
    }
    : TFieldType extends 'image' | 'video' | 'image[]' | 'video[]' | 'json'
    ? never
    : FieldTypeOperations[TFieldType] extends never
    ? never
    : TFieldType extends 'reference'
    ? (
        TFieldDef extends { type: 'reference'; references: readonly (infer TRef)[] }
        ? TRef extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition }
        ? ReferenceFieldOps<TRef['__definition']> | PolymorphicReferenceOps<TFieldDef['references']>
        : TRef extends ContentTypeDefinition
        ? ReferenceFieldOps<TRef> | PolymorphicReferenceOps<TFieldDef['references']>
        : Filter
        : Filter
    )
    : BuildFieldOperations<TFieldType>;

/**
 * Helper type to build field operations as a union type
 */
type BuildFieldOperations<TFieldType extends keyof FieldTypeOperations> =
    TFieldType extends 'id'
    ? IdFieldOps
    : TFieldType extends 'string' | 'text' | 'slug'
    ? StringFieldOps
    : TFieldType extends 'boolean'
    ? BooleanFieldOps
    : TFieldType extends 'int' | 'float'
    ? NumericFieldOps
    : TFieldType extends 'date' | 'time' | 'datetime'
    ? DateTimeFieldOps
    : TFieldType extends 'reference'
    ? Filter // Shouldn't reach here as reference is handled above
    : never;

type IdFieldOps =
    | { eq: string }
    | { not_eq: string }
    | { in: string[] }
    | { not_in: string[] };

type StringFieldOps =
    | { is_null: boolean }
    | { is_not_null: boolean }
    | { eq: string }
    | { not_eq: string }
    | { contains: string }
    | { not_contains: string }
    | { starts_with: string }
    | { not_starts_with: string }
    | { ends_with: string }
    | { not_ends_with: string }
    | { in: string[] }
    | { not_in: string[] };

type BooleanFieldOps =
    | { is_null: boolean }
    | { is_not_null: boolean }
    | { eq: boolean }
    | { not_eq: boolean };

type NumericFieldOps =
    | { is_null: boolean }
    | { is_not_null: boolean }
    | { eq: number }
    | { not_eq: number }
    | { gt: number }
    | { gte: number }
    | { lt: number }
    | { lte: number }
    | { between: [number, number] }
    | { outside: [number, number] }
    | { in: number[] }
    | { not_in: number[] };

type DateTimeFieldOps =
    | { is_null: boolean }
    | { is_not_null: boolean }
    | { eq: string }
    | { not_eq: string }
    | { gt: string }
    | { gte: string }
    | { lt: string }
    | { lte: string }
    | { between: [string, string] }
    | { outside: [string, string] };

/**
 * Helper type to extract the definition from a branded content type or return as-is if it's a definition
 */
type ExtractDefinition<T> =
    T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition }
    ? T['__definition']
    : T extends ContentTypeDefinition
    ? T
    : never;

/**
 * Build filters for a specific content type schema
 * Includes the implicit 'id' field that all content types have
 */
type BuildReferenceFilters<TDef extends ContentTypeDefinition> = {
    and?: BuildReferenceFilters<TDef>[];
    or?: BuildReferenceFilters<TDef>[];
    id?: IdFieldOps;  // Add implicit 'id' field that all content types have
} & {
    [K in keyof TDef['fields']]?: FieldFilter<TDef['fields'][K]['type'], TDef['fields'][K]>;
};

/**
 * Reference field operations - nested filters for the referenced content type
 */
type ReferenceFieldOps<TRefDef extends ContentTypeDefinition | { __isContentTypeDefinition: true; __definition: ContentTypeDefinition }> =
    BuildReferenceFilters<ExtractDefinition<TRefDef>>;

/**
 * Build union filters for polymorphic references
 * When a reference field can point to multiple content types, creates a union of filters for each type
 */
type PolymorphicReferenceOps<TRefs extends readonly any[]> =
    TRefs extends readonly [infer TFirst, ...infer TRest]
    ? (
        TFirst extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition }
        ? ReferenceFieldOps<TFirst['__definition']>
        : TFirst extends ContentTypeDefinition
        ? ReferenceFieldOps<TFirst>
        : never
    ) | PolymorphicReferenceOps<TRest>
    : never;

/**
 * Build a filter for items within a reference array
 * For reference arrays, allow filters for any of the referenced types
 * Includes the implicit 'id' field that all references have
 */
type ListItemReferenceFilter<TRefs extends readonly any[]> =
    { id: IdFieldOps } | PolymorphicReferenceOps<TRefs>;

/**
 * Build a filter for items within a list
 */
type ListItemFilter<TFieldType extends 'string[]' | 'int[]' | 'float[]' | 'boolean[]' | 'date[]' | 'reference[]', TFieldDef extends FieldDefinition = any> =
    TFieldType extends 'string[]'
    ? StringFieldOps
    : TFieldType extends 'int[]'
    ? NumericFieldOps
    : TFieldType extends 'float[]'
    ? NumericFieldOps
    : TFieldType extends 'boolean[]'
    ? BooleanFieldOps
    : TFieldType extends 'date[]'
    ? DateTimeFieldOps
    : TFieldType extends 'reference[]'
    ? (
        TFieldDef extends { type: 'reference[]'; references: readonly (infer TRef)[] }
        ? ListItemReferenceFilter<TFieldDef['references']>
        : Filter
    )
    : never;

/**
 * Type helper for building filter inputs with field-specific operations
 */
export type BuildFiltersInput<
    T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> }
> = {
    and?: BuildFiltersInput<T>[];
    or?: BuildFiltersInput<T>[];
} & {
        [K in keyof T['__fields']]?: FieldFilter<
            T['__definition']['fields'][K & string]['type'] & keyof FieldTypeOperations,
            T['__definition']['fields'][K & string]
        >;
    };

/**
 * Type-safe filter builder for getEntry and getEntries
 * 
 * This function validates that filters match the content type definition at compile time
 */
export type TypeSafeFilters<
    T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> }
> = BuildFiltersInput<T>;

/**
 * Build a type-safe filter object for a specific content type
 * 
 * Example:
 * ```ts
 * const filters = buildFilters(BlogPostContentType, {
 *   Title: { eq: 'Hello' },                           // ✅ Valid: string field with 'eq'
 *   ViewCount: { gt: 10 },                            // ✅ Valid: int field with 'gt'
 *   Tags: { any: { contains: "typescript" } },        // ✅ Valid: string[] with any<contains>
 *   // ViewCount: { contains: 'x' }                   // ❌ Error: 'contains' not valid for int
 *   // FeaturedImage: { eq: '...' }                   // ❌ Error: cannot filter on image
 * });
 * ```
 */
export function buildFilters<
    T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> }
>(
    contentTypeDef: T,
    filters: BuildFiltersInput<T>
): Filter {
    // Convert camelCase field names to snake_case
    const convertToSnakeCase = (str: string): string => {
        return str
            .replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`)
            .replace(/^_/, ''); // Remove leading underscore
    };

    // Recursively convert camelCase field names to snake_case for the backend
    const convertFilters = (obj: any): any => {
        if (!obj || typeof obj !== "object") {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(convertFilters);
        }

        const result: any = {};

        for (const [key, value] of Object.entries(obj)) {
            if (key === "and" || key === "or") {
                // These are special operators, keep as-is
                result[key] = Array.isArray(value) ? value.map(convertFilters) : convertFilters(value);
            } else {
                // Convert field name from camelCase to snake_case
                const snakeKey = convertToSnakeCase(key);
                if (value && typeof value === "object") {
                    result[snakeKey] = convertFilters(value);
                } else {
                    result[snakeKey] = value;
                }
            }
        }

        return result;
    };

    return convertFilters(filters);
}