import type { BrandedContentType } from './generics';
import type { FieldDefinition } from './index';

// Comprehensive Preload typing utilities
// Supports:
// - single reference fields and reference[]
// - polymorphic references (multiple referenced content types)
// - nested preload tuples like ['Child', [['Child', ['Grandchild']]]]

// Convert FieldName literal to the set of allowed field keys for a content type
// (used as a base for filtering reference fields)
type FieldKeys<CT extends BrandedContentType<any>> = keyof CT['__fields'] & string;

// Only reference fields are valid preload targets. Compute keys whose field.type is 'reference' or 'reference[]'
type RefFieldKeys<CT extends BrandedContentType<any>> = {
    [K in FieldKeys<CT>]: CT['__fields'][K & keyof CT['__fields']] extends { type: infer FT }
    ? FT extends 'reference' | 'reference[]' ? K : never
    : never
}[FieldKeys<CT>];

// Extract the FieldDefinition for a given field key
type FieldDefOf<CT extends BrandedContentType<any>, K extends FieldKeys<CT>> = CT['__fields'][K & keyof CT['__fields'] & string] & FieldDefinition;

// Extract the 'references' array for a field (may be undefined)
type ReferencesForField<CT extends BrandedContentType<any>, K extends FieldKeys<CT>> = FieldDefOf<CT, K> extends { references: infer R } ? R : never;

// Helper: is a type a branded content type
type IsBranded<T> = T extends { __isContentTypeDefinition: true } ? T : never;

// Convert a reference target (which may be a branded content-type or a string) into
// the branded content-type if available, otherwise never.
type BrandedFromRef<T> = T extends readonly (infer U)[] ? IsBranded<U> : IsBranded<T>;

// PreloadSpec for a specific branded content type
export type PreloadSpec<CT extends BrandedContentType<any>> = Array<PreloadItem<CT>>;

// A single preload item is either a field name or a tuple [fieldName, innerPreload]
export type PreloadItem<CT extends BrandedContentType<any>> =
    | RefFieldKeys<CT>
    | [RefFieldKeys<CT>, InnerPreloadForField<CT, RefFieldKeys<CT>>];

// If we cannot resolve the referenced content type at compile time (string target),
// fall back to `any` for inner preload to preserve backward compatibility with
// string-based reference declarations. For branded references we will be strict.
type AnyPreload = any;

// Helper: detect whether a References array is string-based (slug names)
type IsStringRef<R> =
    [R] extends [never] ? false
    : R extends string ? true
    : R extends readonly (infer U)[] ? (U extends string ? true : false)
    : false;

// Build inner preload type for a specific field key
type InnerPreloadForField<CT extends BrandedContentType<any>, K extends RefFieldKeys<CT>> =
    FieldDefOf<CT, K> extends { type: infer FT }
    ? FT extends `reference${'' | '[]'}`
    ? (
        // If we have branded content type references, require their PreloadSpec
        BrandedFromRef<ReferencesForField<CT, K>> extends never
        ? (
            // If references are string-based, be permissive for backward compatibility
            IsStringRef<ReferencesForField<CT, K>> extends true ? AnyPreload : never
        )
        : ResolvePreloadForReferences<BrandedFromRef<ReferencesForField<CT, K>>>
    )
    : never
    : never;

// If references can be resolved to one or more branded content types, produce the union
// of their PreloadSpec types (i.e., allow the inner preload to be any of the target CT's PreloadSpec)
type ResolvePreloadForReferences<T> =
    [T] extends [never]
    ? AnyPreload
    : T extends BrandedContentType<any>
    ? PreloadSpec<T> | undefined
    : T extends readonly (infer U)[]
    ? (U extends BrandedContentType<any> ? PreloadSpec<U> : AnyPreload) | undefined
    : AnyPreload;

// Convenience exported helper for consumers who have a branded content type
// Example usage:
//   const preload: PreloadSpec<typeof LevelOneContentType> = [['Child', [['Child', ['Child']]]]]

export { };

// Helper to build a preload with inference from a branded content type.
// Usage:
//   const p = makePreloadFor(LevelOneContentType)([['Child', [['Child', ['Child']]]]]);
// This forces the compiler to check the nested shape against the content type.
// Runtime no-op helpers to help authors get stricter compile-time checking
// of preload literals. These functions accept a branded content type and a
// `PreloadSpec<CT>` and return the same spec. Use them at call sites when
// inline literals are being accepted too permissively by the compiler.
// assertPreload was removed: rely on inline `as const` literals or the
// `getEntriesWithPreload` overload capture when strict checking is needed.
