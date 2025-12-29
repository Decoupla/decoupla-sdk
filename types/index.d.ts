/**
 * Decoupla TypeScript Client
 *
 * Type-safe API client for the Decoupla content management system.
 *
 * @module decoupla.js
 *
 * Main Exports:
 * - createClient() - Initialize the API client
 * - defineContentType() - Define content types with type safety
 * - defineConfig() - Create configuration with workspace and content types
 *
 * Type Exports:
 * - ContentTypeDefinition - Content type schema definition
 * - FieldDefinition - Field definition type
 * - TypeSafeFilters - Type-safe filter definitions
 *
 * Example:
 *   import { createClient, defineContentType } from 'decoupla.js';
 *
 *   const Author = defineContentType({
 *     name: 'author',
 *     fields: { Name: { type: 'string', required: true } }
 *   });
 *
 *   const client = createClient({
 *     workspace: 'my-workspace',
 *     apiToken: 'token'
 *   });
 *
 *   const entry = await client.createEntry('author', { Name: 'John' });
 */
import { type InitSchema, type RequestSchema } from "./modules/schema";
import type { EntryResponse, EntriesResponse, ErrorResponse, InspectResponse, ImageObject, TextObject, PreloadField, PreloadSpec, PrimitiveFieldType, ReferenceFieldType, FieldType, ReferenceTarget, FieldDefinition, ContentTypeDefinition, SyncOptions, SyncAction, SyncResult, FieldDiff } from "./types";
import type { UploadedFile, ImageFile, VideoFile } from "./modules/upload";
import type { FieldValues, EntryMetadata, NormalizedEntryMetadata } from "./modules/entry";
import type { TypeSafeFilters } from "./modules/filters";
export type { EntryResponse, EntriesResponse, ErrorResponse, InspectResponse, ImageObject, TextObject, PreloadField, PrimitiveFieldType, ReferenceFieldType, FieldType, ReferenceTarget, FieldDefinition, ContentTypeDefinition, SyncOptions, SyncAction, SyncResult, FieldDiff, UploadedFile, ImageFile, VideoFile, FieldValues, EntryMetadata, TypeSafeFilters, };
declare const makeRequest: (options: InitSchema) => <T>(request: RequestSchema) => Promise<EntryResponse<T> | EntriesResponse<T> | InspectResponse>;
type Request = ReturnType<typeof makeRequest>;
/**
 * Convert PascalCase to camelCase: ViewCount -> viewCount
 */
type ToCamelCase<S extends string> = S extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : S;
type ExtractReferencedFields<R> = R extends readonly (infer U)[] ? (U extends {
    __isContentTypeDefinition: true;
    __fields: infer F;
} ? F : never) : R extends {
    __isContentTypeDefinition: true;
    __fields: infer F;
} ? F : never;
type RefToReturned<R> = ExtractReferencedFields<R> extends Record<string, FieldDefinition> ? (BuildEntryFromFields<ExtractReferencedFields<R>> & {
    id: string;
}) | LightweightReference : LightweightReference;
type LightweightReference = {
    id: string;
    __sys_content_type: 'reference';
    __sys_id: string;
    __sys_state: 'not_loaded';
};
/**
 * Build an entry type directly from the `fields` object (preserves literal field names/types
 * when content types are created with `defineContentType(... as const)` which stores the
 * fields in the branded `__fields` property).
 */
type BuildEntryFromFields<TFields extends Record<string, FieldDefinition>> = {
    id: string;
} & {
    [K in keyof TFields as K extends string ? ToCamelCase<K> : never]: TFields[K] extends {
        type: 'string';
        required: true;
    } ? string : TFields[K] extends {
        type: 'string';
    } ? string | undefined : TFields[K] extends {
        type: 'text';
        required: true;
    } ? string : TFields[K] extends {
        type: 'text';
    } ? string | undefined : TFields[K] extends {
        type: 'slug';
        required: true;
    } ? string : TFields[K] extends {
        type: 'slug';
    } ? string | undefined : TFields[K] extends {
        type: 'int';
        required: true;
    } ? number : TFields[K] extends {
        type: 'int';
    } ? number | undefined : TFields[K] extends {
        type: 'float';
        required: true;
    } ? number : TFields[K] extends {
        type: 'float';
    } ? number | undefined : TFields[K] extends {
        type: 'boolean';
        required: true;
    } ? boolean : TFields[K] extends {
        type: 'boolean';
    } ? boolean | undefined : TFields[K] extends {
        type: 'date' | 'datetime' | 'time';
        required: true;
    } ? string : TFields[K] extends {
        type: 'date' | 'datetime' | 'time';
    } ? string | undefined : TFields[K] extends {
        type: 'reference';
        required: true;
        references: infer R;
    } ? RefToReturned<R> : TFields[K] extends {
        type: 'reference';
        required: true;
    } ? (LightweightReference | {
        id: string;
    }) : TFields[K] extends {
        type: 'reference';
        references: infer R;
    } ? RefToReturned<R> | undefined : TFields[K] extends {
        type: 'reference';
    } ? (LightweightReference | {
        id: string;
    }) | undefined : TFields[K] extends {
        type: 'reference[]';
        required: true;
        references: infer R;
    } ? RefToReturned<R>[] : TFields[K] extends {
        type: 'reference[]';
        required: true;
    } ? (LightweightReference | {
        id: string;
    })[] : TFields[K] extends {
        type: 'reference[]';
        references: infer R;
    } ? RefToReturned<R>[] | undefined : TFields[K] extends {
        type: 'reference[]';
    } ? (LightweightReference | {
        id: string;
    })[] | undefined : TFields[K] extends {
        type: 'string[]';
        required: true;
    } ? string[] : TFields[K] extends {
        type: 'string[]';
    } ? string[] | undefined : TFields[K] extends {
        type: 'int[]';
        required: true;
    } ? number[] : TFields[K] extends {
        type: 'int[]';
    } ? number[] | undefined : TFields[K] extends {
        type: 'float[]';
        required: true;
    } ? number[] : TFields[K] extends {
        type: 'float[]';
    } ? number[] | undefined : TFields[K] extends {
        type: 'boolean[]';
        required: true;
    } ? boolean[] : TFields[K] extends {
        type: 'boolean[]';
    } ? boolean[] | undefined : TFields[K] extends {
        type: 'date[]' | 'datetime[]' | 'time[]';
        required: true;
    } ? string[] : TFields[K] extends {
        type: 'date[]' | 'datetime[]' | 'time[]';
    } ? string[] | undefined : TFields[K] extends {
        type: 'image';
        required: true;
    } ? ImageObject : TFields[K] extends {
        type: 'image';
    } ? ImageObject | undefined : TFields[K] extends {
        type: 'image[]';
        required: true;
    } ? ImageObject[] : TFields[K] extends {
        type: 'image[]';
    } ? ImageObject[] | undefined : TFields[K] extends {
        type: 'video';
        required: true;
    } ? TextObject : TFields[K] extends {
        type: 'video';
    } ? TextObject | undefined : TFields[K] extends {
        type: 'video[]';
        required: true;
    } ? TextObject[] : TFields[K] extends {
        type: 'video[]';
    } ? TextObject[] | undefined : TFields[K] extends {
        type: 'json';
        required: true;
    } ? Record<string, any> : TFields[K] extends {
        type: 'json';
    } ? Record<string, any> | undefined : never;
};
type ExtractPreloadForKey<P, Key extends string> = P extends Array<infer U> ? (U extends string ? (ToCamelCase<U> extends Key ? undefined : never) : U extends [infer Name, infer Inner] ? (Name extends string ? (ToCamelCase<Name> extends Key ? Inner : never) : never) : never) : never;
type PreloadForKey<K, P> = [K] extends [string] ? ExtractPreloadForKey<P, ToCamelCase<K & string>> : never;
type IsPreloadedKey<K, P> = [PreloadForKey<K, P>] extends [never] ? false : true;
type ExpandRefWhenPreloaded<R, PInner> = ExtractReferencedFields<R> extends Record<string, FieldDefinition> ? (BuildEntryFromFieldsWithPreload<ExtractReferencedFields<R>, PInner> & {
    id: string;
}) : LightweightReference;
type BuildEntryFromFieldsWithPreload<TFields extends Record<string, FieldDefinition>, P> = {
    id: string;
} & {
    [K in keyof TFields as K extends string ? ToCamelCase<K> : never]: TFields[K] extends {
        type: 'string';
        required: true;
    } ? string : TFields[K] extends {
        type: 'string';
    } ? string | undefined : TFields[K] extends {
        type: 'text';
        required: true;
    } ? string : TFields[K] extends {
        type: 'text';
    } ? string | undefined : TFields[K] extends {
        type: 'slug';
        required: true;
    } ? string : TFields[K] extends {
        type: 'slug';
    } ? string | undefined : TFields[K] extends {
        type: 'int';
        required: true;
    } ? number : TFields[K] extends {
        type: 'int';
    } ? number | undefined : TFields[K] extends {
        type: 'float';
        required: true;
    } ? number : TFields[K] extends {
        type: 'float';
    } ? number | undefined : TFields[K] extends {
        type: 'boolean';
        required: true;
    } ? boolean : TFields[K] extends {
        type: 'boolean';
    } ? boolean | undefined : TFields[K] extends {
        type: 'date' | 'datetime' | 'time';
        required: true;
    } ? string : TFields[K] extends {
        type: 'date' | 'datetime' | 'time';
    } ? string | undefined : TFields[K] extends {
        type: 'reference';
        required: true;
        references: infer R;
    } ? IsPreloadedKey<K, P> extends true ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>> : RefToReturned<R> : TFields[K] extends {
        type: 'reference';
        required: true;
    } ? (LightweightReference | {
        id: string;
    }) : TFields[K] extends {
        type: 'reference';
        references: infer R;
    } ? IsPreloadedKey<K, P> extends true ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>> | undefined : (RefToReturned<R> | undefined) : TFields[K] extends {
        type: 'reference';
    } ? (LightweightReference | {
        id: string;
    }) | undefined : TFields[K] extends {
        type: 'reference[]';
        required: true;
        references: infer R;
    } ? IsPreloadedKey<K, P> extends true ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>>[] : RefToReturned<R>[] : TFields[K] extends {
        type: 'reference[]';
        required: true;
    } ? (LightweightReference | {
        id: string;
    })[] : TFields[K] extends {
        type: 'reference[]';
        references: infer R;
    } ? IsPreloadedKey<K, P> extends true ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>>[] | undefined : (RefToReturned<R>[] | undefined) : TFields[K] extends {
        type: 'reference[]';
    } ? (LightweightReference | {
        id: string;
    })[] | undefined : TFields[K] extends {
        type: 'string[]';
        required: true;
    } ? string[] : TFields[K] extends {
        type: 'string[]';
    } ? string[] | undefined : TFields[K] extends {
        type: 'int[]';
        required: true;
    } ? number[] : TFields[K] extends {
        type: 'int[]';
    } ? number[] | undefined : TFields[K] extends {
        type: 'float[]';
        required: true;
    } ? number[] : TFields[K] extends {
        type: 'float[]';
    } ? number[] | undefined : TFields[K] extends {
        type: 'boolean[]';
        required: true;
    } ? boolean[] : TFields[K] extends {
        type: 'boolean[]';
    } ? boolean[] | undefined : TFields[K] extends {
        type: 'date[]' | 'datetime[]' | 'time[]';
        required: true;
    } ? string[] : TFields[K] extends {
        type: 'date[]' | 'datetime[]' | 'time[]';
    } ? string[] | undefined : TFields[K] extends {
        type: 'image';
        required: true;
    } ? ImageObject : TFields[K] extends {
        type: 'image';
    } ? ImageObject | undefined : TFields[K] extends {
        type: 'image[]';
        required: true;
    } ? ImageObject[] : TFields[K] extends {
        type: 'image[]';
    } ? ImageObject[] | undefined : TFields[K] extends {
        type: 'video';
        required: true;
    } ? TextObject : TFields[K] extends {
        type: 'video';
    } ? TextObject | undefined : TFields[K] extends {
        type: 'video[]';
        required: true;
    } ? TextObject[] : TFields[K] extends {
        type: 'video[]';
    } ? TextObject[] | undefined : TFields[K] extends {
        type: 'json';
        required: true;
    } ? Record<string, any> : TFields[K] extends {
        type: 'json';
    } ? Record<string, any> | undefined : never;
};
/**
 * Enhanced sync function that can create, update, and delete fields in addition to content types.
 * This version works with the backend API and supports full field synchronization.
 */
declare const syncWithFields: (request: Request) => (contentTypes: (ContentTypeDefinition | {
    __isContentTypeDefinition: true;
    __definition: ContentTypeDefinition;
    __fields: Record<string, FieldDefinition>;
})[], options?: SyncOptions) => Promise<SyncResult>;
export declare const createClient: (config: InitSchema) => {
    getEntry: <T extends {
        __isContentTypeDefinition: true;
        __definition: ContentTypeDefinition;
        __fields: Record<string, FieldDefinition>;
    }, const P extends PreloadSpec<T> | undefined = undefined>(contentTypeDef: T, entryId: string, options?: {
        preload?: P;
        /** Preferred client option name: selects which dataset (live vs preview) to read. */
        contentView?: "live" | "preview";
    }) => Promise<{
        data: BuildEntryFromFieldsWithPreload<T["__fields"], P> & NormalizedEntryMetadata;
    }>;
    getEntries: <T extends {
        __isContentTypeDefinition: true;
        __definition: ContentTypeDefinition;
        __fields: Record<string, FieldDefinition>;
    }, const P extends PreloadSpec<T> | undefined = undefined>(contentTypeDef: T, options: {
        filters: TypeSafeFilters<T>;
        limit?: number;
        offset?: number;
        preload?: P;
        sort?: [string, "ASC" | "DESC"];
        contentView?: "live" | "preview";
    }) => Promise<EntriesResponse<BuildEntryFromFieldsWithPreload<T["__fields"], P>>>;
    inspect: () => Promise<InspectResponse>;
    /**
     * Validate whether the current token can read the requested content view.
     * Returns true when the view is accessible, false when an authorization error is returned.
     * This helper inspects the remote for a content type and issues a harmless get_entries
     * against that content type using the requested view; it treats a structured
     * `{ errors: [{ field: 'authorization', ... }] }` as a permission failure.
     */
    validateContentView: (view: "live" | "preview") => Promise<boolean>;
    sync: (contentTypes: (ContentTypeDefinition | {
        __isContentTypeDefinition: true;
        __definition: ContentTypeDefinition;
        __fields: Record<string, FieldDefinition>;
    })[], options?: SyncOptions) => Promise<SyncResult>;
    syncWithFields: (contentTypes: Parameters<ReturnType<typeof syncWithFields>>[0], options?: Parameters<ReturnType<typeof syncWithFields>>[1]) => Promise<SyncResult>;
    upload: (file: File | Blob, filename?: string) => Promise<UploadedFile>;
    createEntry: <T extends {
        __isContentTypeDefinition: true;
        __definition: ContentTypeDefinition;
        __fields: Record<string, FieldDefinition>;
    }, const P extends PreloadSpec<T> | undefined = undefined>(contentTypeDef: T, fieldValues: FieldValues, optionsParam?: boolean | {
        published?: boolean;
        preload?: P;
    }) => Promise<NormalizedEntryMetadata>;
    updateEntry: <T extends {
        __isContentTypeDefinition: true;
        __definition: ContentTypeDefinition;
        __fields: Record<string, FieldDefinition>;
    }, const P extends PreloadSpec<T> | undefined = undefined>(contentTypeDef: T, entryId: string, fieldValues: FieldValues, optionsParam?: boolean | {
        published?: boolean;
        preload?: P;
    }) => Promise<NormalizedEntryMetadata>;
    deleteContentType: (contentTypeId: string) => Promise<void>;
};
/**
 * Utility: safely get an entry ID whether the field is a raw id string or an expanded object
 * Returns empty string for invalid inputs.
 */
export declare const getEntryId: (entry: unknown) => string;
/**
 * Type guard: true when the value is an expanded entry object with an `id` property
 */
export declare const isExpandedEntry: <T extends {
    id: string;
} = {
    id: string;
}>(value: unknown) => value is T;
export { defineContentType, defineConfig } from './types';
