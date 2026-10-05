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

import { normalizeVideos } from './modules/videos';
import { normalizeImages } from './modules/images';
import { validatePagination, readPageInfo } from './modules/pagination';
import type { BrandedContentType } from './types/generics';
import type { GetEntryOptions, GetEntriesOptions, PaginationOptions, UpdateEntriesOptions, UpdateEntriesResponse } from './types/queries';
import type { CreateFieldValues, UpdateFieldValues } from './types/writes';
export type { RequestOptions } from "./modules/transport";
export type { VideoTransform, VideoOptions, VideoOptionsFor } from "./types/videos";
export type { UpdateEntriesOptions, UpdateEntriesResponse } from "./types/queries";
export type { GetEntryOptions, GetEntriesOptions, PaginationOptions, SortField, SortSpec } from './types/queries';
export type { CreateFieldValues, UpdateFieldValues, FieldWriteValue, EntryIdInput, JsonValue } from './types/writes';
export type { ImageFormat, ImageTransform, ImageOptions, ImageOptionsFor } from './types/images';

import { apiFetch, storageFetch, ApiError, requestUrl, type RequestOptions } from "./modules/transport";
export { ApiError, EntryNotFoundError } from "./modules/transport";
import { EntryNotFoundError } from "./modules/transport";
import { initSchema, requestSchema, type InitSchema, type RequestSchema, snakeToCamel, camelToSnake } from "./modules/schema";
import type {
    EntryResponse,
    EntriesResponse,
    EntriesResponseWithCount,
    EntryPageInfo,
    ErrorResponse,
    InspectResponse,
    ImageObject,
    VideoObject,
    TextObject,
    PreloadField,
    PreloadSpec,
    PrimitiveFieldType,
    ReferenceFieldType,
    FieldType,
    ReferenceTarget,
    FieldDefinition,
    ContentTypeDefinition,
    SyncOptions,
    SyncAction,
    SyncResult,
    FieldDiff,
} from "./types";
import type {
    UploadedFile,
    ImageFile,
    VideoFile,
    UploadFileResponse,
    UploadOptions,
} from "./modules/upload";
import type {
    FieldValues,
    EntryMetadata,
    NormalizedEntryMetadata,
    CreateEntryResponse,
    UpdateEntryResponse,
} from "./modules/entry";
import {
    validateFile,
    uploadContentType,
    getFileType,
    isSupportedFileFormat,
} from "./modules/upload";
import {
    isValidUUID,
    normalizeReadEntry,
    validateAndCoerceFieldValues,
} from "./modules/entry";
import { buildCreateFieldRequest, buildUpdateFieldRequest, buildCreateContentTypeRequest } from "./modules/sync-api";
import type { TypeSafeFilters } from "./modules/filters";
import { buildFilters } from "./modules/filters";
import { debug } from './utils/logger';

export type {
    EntryResponse,
    EntriesResponse,
    EntriesResponseWithCount,
    EntryPageInfo,
    ErrorResponse,
    InspectResponse,
    ImageObject,
    VideoObject,
    TextObject,
    PreloadField,
    PrimitiveFieldType,
    ReferenceFieldType,
    FieldType,
    ReferenceTarget,
    FieldDefinition,
    ContentTypeDefinition,
    SyncOptions,
    SyncAction,
    SyncResult,
    FieldDiff,
    UploadedFile,
    UploadOptions,
    ImageFile,
    VideoFile,
    FieldValues,
    EntryMetadata,
    TypeSafeFilters,
};

const {
    DECOUPLA_API_URL_BASE = "https://api.decoupla.com/public/api/1.0/workspace/",
} = typeof process !== "undefined" ? process.env : {};

const makeRequest = (options: InitSchema) => async <T>(request: RequestSchema, controls: RequestOptions = {}): Promise<EntryResponse<T> | EntriesResponse<T> | InspectResponse> => {

    const { apiToken, workspace, requestTimeoutMs } = options;

    const {
        op_type,
        api_type,
        filters,
        type,
        preload,
        sort,
        limit,
        offset,
        return_count,
        keyset, after, before, count_limit,
        images,
        videos,
    } = requestSchema.parse(request);

    const sendSort = (sort || []).reduce((acc, [field, direction]) => {
        acc = acc || [];
        acc.push({ field, direction });
        return acc;
    }, undefined as {
        field: string;
        direction: "ASC" | "DESC";
    }[] | undefined);

    // Determine outgoing api_type: inspect doesn't require api_type and we default to 'live' for other ops
    const outgoingApiType = op_type === 'inspect' ? undefined : (api_type ?? 'live');

    const requestBody: any = {
        op_type,
        type,
        // pass through entry_id when present (used by get_entry)
        entry_id: (request as any).entry_id,
        filters,
        preload,
        sort: sendSort,
        limit,
        offset,
        return_count,
        keyset, after, before, count_limit,
        images: normalizeImages(images),
        videos: normalizeVideos(videos),
    };

    if (outgoingApiType) requestBody.api_type = outgoingApiType;

    const req = await apiFetch(requestUrl(options, DECOUPLA_API_URL_BASE), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controls.signal,
    }, controls.requestTimeoutMs ?? requestTimeoutMs, options.fetch, controls.maxRetries ?? options.maxRetries);

    const respData = await req.json();
    const valid = op_type === 'inspect'
        ? Array.isArray(respData.data?.content_types) && respData.data.content_types.every((ct: any) =>
            typeof ct.id === 'string' && Array.isArray(ct.fields))
        : op_type === 'get_entries'
            ? (keyset ? Array.isArray(respData.data?.entries) && !!respData.data?.page_info : Array.isArray(respData.data) || (Array.isArray(respData.data?.entries) && typeof respData.data.count === 'number'))
            : respData.data === null || (typeof respData.data === 'object' && !Array.isArray(respData.data));
    if (!valid) throw new ApiError(`Invalid API response for ${op_type}`);

    return respData as EntriesResponse<T> | EntryResponse<T> | InspectResponse;
}

type Request = ReturnType<typeof makeRequest>;

/**
 * Helper type to convert a string to camelCase (only lowercase first letter for single words)
 */
type CamelCaseField<T extends string> = T extends `${infer First}${infer Rest}`
    ? `${Lowercase<First>}${Rest}`
    : T;

/**
 * Convert PascalCase to camelCase: ViewCount -> viewCount
 */
type ToCamelCase<S extends string> =
    S extends `${infer First}${infer Rest}`
    ? `${Lowercase<First>}${Rest}`
    : S;

/**
 * Helper type to build the entry data type from a content type definition
 * Maps field types to their TypeScript value types
 * Required fields are not nullable, optional fields are nullable/undefined
 * Field names are converted to camelCase (ViewCount -> viewCount, IsPublished -> isPublished)
 */
type BuildEntryType<TDef extends ContentTypeDefinition> = {
    id: string;
} & {
    [K in keyof TDef['fields']as K extends string ? ToCamelCase<K> : never]:
    TDef['fields'][K] extends { type: 'string'; required: true }
    ? string
    : TDef['fields'][K] extends { type: 'string' }
    ? string | undefined
    : TDef['fields'][K] extends { type: 'text'; required: true }
    ? string
    : TDef['fields'][K] extends { type: 'text' }
    ? string | undefined
    : TDef['fields'][K] extends { type: 'slug'; required: true }
    ? string
    : TDef['fields'][K] extends { type: 'slug' }
    ? string | undefined
    : TDef['fields'][K] extends { type: 'int'; required: true }
    ? number
    : TDef['fields'][K] extends { type: 'int' }
    ? number | undefined
    : TDef['fields'][K] extends { type: 'float'; required: true }
    ? number
    : TDef['fields'][K] extends { type: 'float' }
    ? number | undefined
    : TDef['fields'][K] extends { type: 'boolean'; required: true }
    ? boolean
    : TDef['fields'][K] extends { type: 'boolean' }
    ? boolean | undefined
    : TDef['fields'][K] extends { type: 'date' | 'datetime' | 'time'; required: true }
    ? string
    : TDef['fields'][K] extends { type: 'date' | 'datetime' | 'time' }
    ? string | undefined
    : TDef['fields'][K] extends { type: 'reference'; required: true; references: infer R }
    ? RefToReturned<R>
    : TDef['fields'][K] extends { type: 'reference'; required: true }
    ? LightweightReference
    : TDef['fields'][K] extends { type: 'reference'; references: infer R }
    ? RefToReturned<R> | undefined
    : TDef['fields'][K] extends { type: 'reference' }
    ? LightweightReference | undefined
    : TDef['fields'][K] extends { type: 'reference[]'; required: true; references: infer R }
    ? RefToReturned<R>[]
    : TDef['fields'][K] extends { type: 'reference[]'; required: true }
    ? LightweightReference[]
    : TDef['fields'][K] extends { type: 'reference[]'; references: infer R }
    ? RefToReturned<R>[] | undefined
    : TDef['fields'][K] extends { type: 'reference[]' }
    ? LightweightReference[] | undefined
    : TDef['fields'][K] extends { type: 'string[]'; required: true }
    ? string[]
    : TDef['fields'][K] extends { type: 'string[]' }
    ? string[] | undefined
    : TDef['fields'][K] extends { type: 'int[]'; required: true }
    ? number[]
    : TDef['fields'][K] extends { type: 'int[]' }
    ? number[] | undefined
    : TDef['fields'][K] extends { type: 'float[]'; required: true }
    ? number[]
    : TDef['fields'][K] extends { type: 'float[]' }
    ? number[] | undefined
    : TDef['fields'][K] extends { type: 'boolean[]'; required: true }
    ? boolean[]
    : TDef['fields'][K] extends { type: 'boolean[]' }
    ? boolean[] | undefined
    : TDef['fields'][K] extends { type: 'date[]' | 'datetime[]' | 'time[]'; required: true }
    ? string[]
    : TDef['fields'][K] extends { type: 'date[]' | 'datetime[]' | 'time[]' }
    ? string[] | undefined
    : TDef['fields'][K] extends { type: 'image'; required: true }
    ? ImageObject
    : TDef['fields'][K] extends { type: 'image' }
    ? ImageObject | undefined
    : TDef['fields'][K] extends { type: 'image[]'; required: true }
    ? ImageObject[]
    : TDef['fields'][K] extends { type: 'image[]' }
    ? ImageObject[] | undefined
    : TDef['fields'][K] extends { type: 'video'; required: true }
    ? VideoObject
    : TDef['fields'][K] extends { type: 'video' }
    ? VideoObject | undefined
    : TDef['fields'][K] extends { type: 'video[]'; required: true }
    ? VideoObject[]
    : TDef['fields'][K] extends { type: 'video[]' }
    ? VideoObject[] | undefined
    : TDef['fields'][K] extends { type: 'json'; required: true }
    ? Record<string, any>
    : TDef['fields'][K] extends { type: 'json' }
    ? Record<string, any> | undefined
    : never;
};

// Helper types to map 'references' metadata (which may be branded content types)
type ExtractReferencedFields<R> =
    R extends readonly (infer U)[] ? (
        U extends { __isContentTypeDefinition: true; __fields: infer F } ? F : never
    ) : R extends { __isContentTypeDefinition: true; __fields: infer F } ? F : never;

type RefToReturned<R> =
    ExtractReferencedFields<R> extends Record<string, FieldDefinition>
    ? (BuildEntryFromFields<ExtractReferencedFields<R>> & { id: string }) | LightweightReference
    : LightweightReference;

// Lightweight representation returned by the server when a reference is not loaded.
// Previously we allowed plain string IDs in many places; switch to a structured
// lightweight shape so callers can rely on stable metadata for "not_loaded" refs.
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
    [K in keyof TFields as K extends string ? ToCamelCase<K> : never]:
    TFields[K] extends { type: 'string'; required: true }
    ? string
    : TFields[K] extends { type: 'string' }
    ? string | undefined
    : TFields[K] extends { type: 'text'; required: true }
    ? string
    : TFields[K] extends { type: 'text' }
    ? string | undefined
    : TFields[K] extends { type: 'slug'; required: true }
    ? string
    : TFields[K] extends { type: 'slug' }
    ? string | undefined
    : TFields[K] extends { type: 'int'; required: true }
    ? number
    : TFields[K] extends { type: 'int' }
    ? number | undefined
    : TFields[K] extends { type: 'float'; required: true }
    ? number
    : TFields[K] extends { type: 'float' }
    ? number | undefined
    : TFields[K] extends { type: 'boolean'; required: true }
    ? boolean
    : TFields[K] extends { type: 'boolean' }
    ? boolean | undefined
    : TFields[K] extends { type: 'date' | 'datetime' | 'time'; required: true }
    ? string
    : TFields[K] extends { type: 'date' | 'datetime' | 'time' }
    ? string | undefined
    : TFields[K] extends { type: 'reference'; required: true; references: infer R }
    ? RefToReturned<R>
    : TFields[K] extends { type: 'reference'; required: true }
    ? (LightweightReference | { id: string })
    : TFields[K] extends { type: 'reference'; references: infer R }
    ? RefToReturned<R> | undefined
    : TFields[K] extends { type: 'reference' }
    ? (LightweightReference | { id: string }) | undefined
    : TFields[K] extends { type: 'reference[]'; required: true; references: infer R }
    ? RefToReturned<R>[]
    : TFields[K] extends { type: 'reference[]'; required: true }
    ? (LightweightReference | { id: string })[]
    : TFields[K] extends { type: 'reference[]'; references: infer R }
    ? RefToReturned<R>[] | undefined
    : TFields[K] extends { type: 'reference[]' }
    ? (LightweightReference | { id: string })[] | undefined
    : TFields[K] extends { type: 'string[]'; required: true }
    ? string[]
    : TFields[K] extends { type: 'string[]' }
    ? string[] | undefined
    : TFields[K] extends { type: 'int[]'; required: true }
    ? number[]
    : TFields[K] extends { type: 'int[]' }
    ? number[] | undefined
    : TFields[K] extends { type: 'float[]'; required: true }
    ? number[]
    : TFields[K] extends { type: 'float[]' }
    ? number[] | undefined
    : TFields[K] extends { type: 'boolean[]'; required: true }
    ? boolean[]
    : TFields[K] extends { type: 'boolean[]' }
    ? boolean[] | undefined
    : TFields[K] extends { type: 'date[]' | 'datetime[]' | 'time[]'; required: true }
    ? string[]
    : TFields[K] extends { type: 'date[]' | 'datetime[]' | 'time[]' }
    ? string[] | undefined
    : TFields[K] extends { type: 'image'; required: true }
    ? ImageObject
    : TFields[K] extends { type: 'image' }
    ? ImageObject | undefined
    : TFields[K] extends { type: 'image[]'; required: true }
    ? ImageObject[]
    : TFields[K] extends { type: 'image[]' }
    ? ImageObject[] | undefined
    : TFields[K] extends { type: 'video'; required: true }
    ? VideoObject
    : TFields[K] extends { type: 'video' }
    ? VideoObject | undefined
    : TFields[K] extends { type: 'video[]'; required: true }
    ? VideoObject[]
    : TFields[K] extends { type: 'video[]' }
    ? VideoObject[] | undefined
    : TFields[K] extends { type: 'json'; required: true }
    ? Record<string, any>
    : TFields[K] extends { type: 'json' }
    ? Record<string, any> | undefined
    : never;
};

// ---------------------------
// Preload-aware type helpers
// ---------------------------

// Convert a PreloadField item to a top-level camelCase key
type PreloadItemToKey<I> =
    I extends string ? ToCamelCase<I>
    : I extends [infer Key, any] ? Key extends string ? ToCamelCase<Key> : never
    : never;

// Extract top-level preload keys from a PreloadField type P
type PreloadKeys<P> = [P] extends [undefined] ? never : (
    P extends Array<infer U> ? PreloadItemToKey<U> : never
);

// Extract the inner preload tuple for a specific top-level key.
// If the preload contains the string 'Author' then the inner preload is `undefined`.
// If the preload contains ['Author', [ ... ]] then the inner preload is that inner array type.
type ExtractPreloadForKey<P, Key extends string> = P extends Array<infer U> ? (
    U extends string ? (ToCamelCase<U> extends Key ? undefined : never)
    : U extends [infer Name, infer Inner] ? (Name extends string ? (ToCamelCase<Name> extends Key ? Inner : never) : never)
    : never
) : never;

type PreloadForKey<K, P> = [K] extends [string] ? ExtractPreloadForKey<P, ToCamelCase<K & string>> : never;

// Helper to test whether a mapped key K (from TFields) is present in the Preload keys
type IsPreloadedKey<K, P> = [PreloadForKey<K, P>] extends [never] ? false : true;

// When a reference field is preloaded, prefer an expanded object (if we can resolve it at compile time)
type ExpandRefWhenPreloaded<R, PInner> =
    ExtractReferencedFields<R> extends Record<string, FieldDefinition>
    ? (BuildEntryFromFieldsWithPreload<ExtractReferencedFields<R>, PInner> & { id: string })
    : LightweightReference;

// Build an entry type from fields but if a field name is present in PreloadKeys<P> then
// reference/reference[] fields are expanded to their target shapes (or at least {id:string})
type BuildEntryFromFieldsWithPreload<
    TFields extends Record<string, FieldDefinition>,
    P
> = {
    id: string;
} & {
        [K in keyof TFields as K extends string ? ToCamelCase<K> : never]:
        // string
        TFields[K] extends { type: 'string'; required: true }
        ? string
        : TFields[K] extends { type: 'string' }
        ? string | undefined
        // text
        : TFields[K] extends { type: 'text'; required: true }
        ? string
        : TFields[K] extends { type: 'text' }
        ? string | undefined
        // slug
        : TFields[K] extends { type: 'slug'; required: true }
        ? string
        : TFields[K] extends { type: 'slug' }
        ? string | undefined
        // int
        : TFields[K] extends { type: 'int'; required: true }
        ? number
        : TFields[K] extends { type: 'int' }
        ? number | undefined
        // float
        : TFields[K] extends { type: 'float'; required: true }
        ? number
        : TFields[K] extends { type: 'float' }
        ? number | undefined
        // boolean
        : TFields[K] extends { type: 'boolean'; required: true }
        ? boolean
        : TFields[K] extends { type: 'boolean' }
        ? boolean | undefined
        // date/datetime/time
        : TFields[K] extends { type: 'date' | 'datetime' | 'time'; required: true }
        ? string
        : TFields[K] extends { type: 'date' | 'datetime' | 'time' }
        ? string | undefined
        // reference (single) - check preload
        : TFields[K] extends { type: 'reference'; required: true; references: infer R }
        ? IsPreloadedKey<K, P> extends true
        ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>>
        : RefToReturned<R>
        : TFields[K] extends { type: 'reference'; required: true }
        ? (LightweightReference | { id: string })
        : TFields[K] extends { type: 'reference'; references: infer R }
        ? IsPreloadedKey<K, P> extends true
        ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>> | undefined
        : (RefToReturned<R> | undefined)
        : TFields[K] extends { type: 'reference' }
        ? (LightweightReference | { id: string }) | undefined
        // reference[]
        : TFields[K] extends { type: 'reference[]'; required: true; references: infer R }
        ? IsPreloadedKey<K, P> extends true
        ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>>[]
        : RefToReturned<R>[]
        : TFields[K] extends { type: 'reference[]'; required: true }
        ? (LightweightReference | { id: string })[]
        : TFields[K] extends { type: 'reference[]'; references: infer R }
        ? IsPreloadedKey<K, P> extends true
        ? ExpandRefWhenPreloaded<R, PreloadForKey<K, P>>[] | undefined
        : (RefToReturned<R>[] | undefined)
        : TFields[K] extends { type: 'reference[]' }
        ? (LightweightReference | { id: string })[] | undefined
        // arrays and other primitives follow original mapping
        : TFields[K] extends { type: 'string[]'; required: true }
        ? string[]
        : TFields[K] extends { type: 'string[]' }
        ? string[] | undefined
        : TFields[K] extends { type: 'int[]'; required: true }
        ? number[]
        : TFields[K] extends { type: 'int[]' }
        ? number[] | undefined
        : TFields[K] extends { type: 'float[]'; required: true }
        ? number[]
        : TFields[K] extends { type: 'float[]' }
        ? number[] | undefined
        : TFields[K] extends { type: 'boolean[]'; required: true }
        ? boolean[]
        : TFields[K] extends { type: 'boolean[]' }
        ? boolean[] | undefined
        : TFields[K] extends { type: 'date[]' | 'datetime[]' | 'time[]'; required: true }
        ? string[]
        : TFields[K] extends { type: 'date[]' | 'datetime[]' | 'time[]' }
        ? string[] | undefined
        : TFields[K] extends { type: 'image'; required: true }
        ? ImageObject
        : TFields[K] extends { type: 'image' }
        ? ImageObject | undefined
        : TFields[K] extends { type: 'image[]'; required: true }
        ? ImageObject[]
        : TFields[K] extends { type: 'image[]' }
        ? ImageObject[] | undefined
        : TFields[K] extends { type: 'video'; required: true }
        ? VideoObject
        : TFields[K] extends { type: 'video' }
        ? VideoObject | undefined
        : TFields[K] extends { type: 'video[]'; required: true }
        ? VideoObject[]
        : TFields[K] extends { type: 'video[]' }
        ? VideoObject[] | undefined
        : TFields[K] extends { type: 'json'; required: true }
        ? Record<string, any>
        : TFields[K] extends { type: 'json' }
        ? Record<string, any> | undefined
        : never;
    };

const getEntry = (request: Request) =>
    async <T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> }, const P extends PreloadSpec<T> | undefined = undefined>(
        contentTypeDef: T,
        entryId: string,
        options?: GetEntryOptions<T, P>
    ): Promise<{ data: (BuildEntryFromFieldsWithPreload<T['__fields'], P> & NormalizedEntryMetadata) | null }> => {
        // For get_entry, entry_id is a top-level parameter, not in filters
        // Normalize preload shapes to the backend's nested-array grammar
        const normalizePreload = (p: any): any => {
            if (!Array.isArray(p)) return p;
            const out: any[] = [];
            for (const item of p) {
                if (typeof item === 'string') {
                    out.push(camelToSnake(item));
                    continue;
                }
                if (!Array.isArray(item)) {
                    out.push(item);
                    continue;
                }
                const [key, inner] = item;
                // If inner is null/undefined, treat as simple string preload
                if (inner == null) {
                    out.push(camelToSnake(key));
                    continue;
                }

                // Determine inner as an array of preload items.
                let innerArr: any[];
                if (typeof inner === 'string') {
                    innerArr = [inner];
                } else if (Array.isArray(inner)) {
                    // If inner looks like a single tuple [string, ...], treat it as one item and wrap it.
                    if (inner.length === 2 && typeof inner[0] === 'string' && (Array.isArray(inner[1]) || inner[1] == null)) {
                        innerArr = [inner];
                    } else {
                        innerArr = inner;
                    }
                } else {
                    innerArr = [inner];
                }

                out.push([camelToSnake(key), normalizePreload(innerArr)]);
            }
            return out;
        };

        const chosenApiType = options?.contentView ?? 'live';

        const reqBody = {
            op_type: 'get_entry',
            type: contentTypeDef.__definition.name,
            entry_id: entryId,
            preload: normalizePreload(options?.preload || []),
            images: options?.images,
            videos: options?.videos,
            api_type: chosenApiType,
        } as any;

        try { debug('[getEntry] request body:', JSON.stringify(reqBody)); } catch (e) { }

        // Use the shared request helper which already handles auth/errors/parsing
        const resp = await request(reqBody as any, options) as any;

        try { debug('[getEntry] raw response:', JSON.stringify(resp, null, 2)); } catch (e) { }

        const entry = resp?.data?.entry ?? resp?.data?.node ?? null;
        if (entry === null) return { data: null };

        // Normalize snake_case field names to camelCase for the flat response
        const normalizedEntry = normalizeReadEntry(entry || {}, reqBody.preload);

        return {
            data: normalizedEntry as BuildEntryFromFieldsWithPreload<T['__fields'], P> & NormalizedEntryMetadata,
        };
    }

const getEntryOrThrow = (request: Request) =>
    async <T extends BrandedContentType<any>, const P extends PreloadSpec<T> | undefined = undefined>(
        contentTypeDef: T,
        entryId: string,
        options?: GetEntryOptions<T, P>
    ): Promise<{ data: BuildEntryFromFieldsWithPreload<T['__fields'], P> & NormalizedEntryMetadata }> => {
        const response = await getEntry(request)(contentTypeDef, entryId, options);
        if (response.data === null) throw new EntryNotFoundError(contentTypeDef.__definition.name, entryId);
        return { data: response.data };
    };

/** Supports opt-in keyset traversal; changing datasets are not a snapshot. */
const iterateEntries = (request: Request) =>
    async function* <T extends BrandedContentType<any>, const P extends PreloadSpec<T> | undefined = undefined>(
        contentTypeDef: T,
        options: PaginationOptions<T, P> = {}
    ): AsyncGenerator<BuildEntryFromFieldsWithPreload<T['__fields'], P>, void, unknown> {
        const { pageSize = 100, offset: initialOffset = 0, ...query } = options;
        if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be a positive safe integer');
        if (!Number.isSafeInteger(initialOffset) || initialOffset < 0) throw new Error('offset must be a non-negative safe integer');
        validatePagination({ ...query, offset: options.offset, limit: pageSize });
        if (query.keyset) {
            let after = query.after;
            const seen = new Set<string>(after ? [after] : []);
            while (true) {
                const page = await getEntries(request)(contentTypeDef, { ...query, keyset: true, after, preload: options.preload, limit: pageSize });
                for (const entry of page.data) {
                    if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
                    yield entry;
                }
                if (!page.pageInfo.hasNextPage) return;
                const cursor = page.pageInfo.endCursor;
                if (!cursor || seen.has(cursor)) throw new ApiError('Invalid pagination response: missing or repeated next cursor');
                seen.add(cursor);
                after = cursor;
            }
        }
        let offset = initialOffset;
        const sort = [...(query.sort || [])];
        if (!sort.some(([field]) => field === 'id')) sort.push(['id', 'ASC']);
        while (true) {
            const page = await getEntries(request)(contentTypeDef, { ...query, sort, preload: options.preload, offset, limit: pageSize });
            for (const entry of page.data) {
                if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
                yield entry;
            }
            if (page.data.length < pageSize) return;
            offset += page.data.length;
        }
    };

const getAllEntries = (request: Request) =>
    async <T extends BrandedContentType<any>, const P extends PreloadSpec<T> | undefined = undefined>(
        contentTypeDef: T,
        options: PaginationOptions<T, P> = {}
    ): Promise<EntriesResponse<BuildEntryFromFieldsWithPreload<T['__fields'], P>>> => {
        const data: Array<BuildEntryFromFieldsWithPreload<T['__fields'], P>> = [];
        for await (const entry of iterateEntries(request)(contentTypeDef, options)) data.push(entry);
        return { data };
    };

const inspect = (request: Request) =>
    async (controls: RequestOptions = {}) => {
        const resp = await request({
            op_type: 'inspect',
        }, controls);

        return resp as InspectResponse;
    }

const prepareEntriesQuery = async (request: Request, contentTypeDef: BrandedContentType<any>, options: any) => {
        const {
            filters,
            limit,
            offset,
            preload = [] as any,
            sort = [],
            contentView: optContentView,
            returnCount: optReturnCount,
        } = options as any;

        const api_type = optContentView ?? 'live';

        // Normalize preload shapes to the backend's nested-array grammar (same as getEntry)
        const normalizePreload = (p: any): any => {
            if (!Array.isArray(p)) return p;
            const out: any[] = [];
            for (const item of p) {
                if (typeof item === 'string') {
                    out.push(camelToSnake(item));
                    continue;
                }
                if (!Array.isArray(item)) {
                    out.push(item);
                    continue;
                }
                const [key, inner] = item;
                if (inner == null) {
                    out.push(camelToSnake(key));
                    continue;
                }
                let innerArr: any[];
                if (typeof inner === 'string') {
                    innerArr = [inner];
                } else if (Array.isArray(inner)) {
                    if (inner.length === 2 && typeof inner[0] === 'string' && (Array.isArray(inner[1]) || inner[1] == null)) {
                        innerArr = [inner];
                    } else {
                        innerArr = inner;
                    }
                } else {
                    innerArr = [inner];
                }
                out.push([camelToSnake(key), normalizePreload(innerArr)]);
            }
            return out;
        };

        // Convert camelCase field names to snake_case using buildFilters
        let backendFilters = buildFilters(contentTypeDef, filters);

        // Handle reference field naming: backend expects {fieldName}_{contentTypeName}_filter
        // First, get the inspect data to map UUIDs to content type names
        try {
            const inspectResult = await inspect(request)(options);

            // Build a mapping of reference type UUIDs to content type names/slugs
            const uuidToContentTypeName = new Map<string, string>();
            inspectResult.data.content_types.forEach((ct: any) => {
                // Use slug if available, otherwise fall back to id
                const contentTypeName = ct.slug || ct.id;
                uuidToContentTypeName.set(ct.id, contentTypeName);
            });

            // Build a mapping of field names to their reference content types
            // We'll use the backend's field metadata to determine the correct reference types
            const fieldReferenceMap = new Map<string, string[]>();

            // Find the current content type in the inspect response
            const currentCTMetadata = inspectResult.data.content_types.find((ct: any) =>
                ct.slug === contentTypeDef.__definition.name || ct.id === contentTypeDef.__definition.name
            );

            if (currentCTMetadata && currentCTMetadata.fields) {
                // Use the metadata from the backend to get the reference types
                currentCTMetadata.fields.forEach((field: any) => {
                    if ((field.type === 'reference' || field.type === 'reference[]') && field.meta?.reference_types) {
                        // Support polymorphic references - store ALL reference types for this field
                        const contentTypeNames = field.meta.reference_types
                            .map((refTypeId: string) => uuidToContentTypeName.get(refTypeId) || refTypeId);
                        // field.slug is already in snake_case from the backend
                        fieldReferenceMap.set(field.slug, contentTypeNames);
                    }
                });
            }

            // Transform filter field names for reference fields
            // Reference filters are already in the correct nested structure from the user:
            // Author: { id: { eq: "123" } } or Author: { name: { starts_with: "John" } }
            // For polymorphic references, we can also filter by specific type:
            // Speakers: { Author: { id: { eq: "123" } } } filters speakers that are Authors
            // We rename the field from Author to author_author_filter or speakers_author_filter
            const transformReferenceFilters = (obj: any, referenceMap: Map<string, string[]>, depth = 0): any => {
                if (!obj || typeof obj !== "object") {
                    return obj;
                }

                if (Array.isArray(obj)) {
                    return obj.map(item => transformReferenceFilters(item, referenceMap, depth + 1));
                }

                const result: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (key === "and" || key === "or") {
                        // Logical operators: transform their contents
                        result[key] = Array.isArray(value)
                            ? (value as any[]).map(v => transformReferenceFilters(v, referenceMap, depth + 1))
                            : transformReferenceFilters(value, referenceMap, depth + 1);
                    } else if (referenceMap.has(key)) {
                        // This is a reference field - rename it and pass through the nested structure as-is
                        const contentTypeNames = referenceMap.get(key)!;
                        const valueAsObj = value && typeof value === "object" ? (value as Record<string, any>) : {};
                        const valueKeys = Object.keys(valueAsObj);

                        // Check if value has list operators (any, none, every) for reference arrays
                        const listOperator = valueKeys.find(vk => ['any', 'none', 'every'].includes(vk));

                        if (listOperator) {
                            // This is a reference array filter with list operator
                            // Extract the inner filter that may have type-specific filters
                            const innerFilter = valueAsObj[listOperator];
                            const innerFilterObj = innerFilter && typeof innerFilter === "object" ? innerFilter as Record<string, any> : {};
                            const innerKeys = Object.keys(innerFilterObj);
                            // Handle both original case (Author) and snake_case (author) versions
                            const innerSpecifiedType = innerKeys.find(ik =>
                                contentTypeNames.includes(ik) ||  // Original case: Author, Product, etc.
                                contentTypeNames.some(ct => snakeToCamel(ik) === ct)  // Snake case: author -> Author
                            );

                            if (innerSpecifiedType && innerFilterObj[innerSpecifiedType]) {
                                // Type-specific filter inside list operator
                                // Normalize the type name to original case for the filter key
                                const normalizedType = contentTypeNames.includes(innerSpecifiedType)
                                    ? innerSpecifiedType
                                    : snakeToCamel(innerSpecifiedType);
                                const newKey = `${key}_${normalizedType}_filter`;
                                const transformedInner = transformReferenceFilters(innerFilterObj[innerSpecifiedType], referenceMap, depth + 1);
                                result[newKey] = {
                                    [listOperator]: transformedInner
                                };
                            } else {
                                // No type specified, use first available type
                                const contentTypeName = contentTypeNames[0];
                                const newKey = `${key}_${contentTypeName}_filter`;
                                const transformedInner = transformReferenceFilters(innerFilter, referenceMap, depth + 1);
                                result[newKey] = {
                                    [listOperator]: transformedInner
                                };
                            }
                        } else {
                            // Regular reference filter (not an array)
                            // Check if value is a type-specific filter
                            // Need to handle both original case (Author) and snake_case (author) versions
                            const specifiedType = valueKeys.find(vk =>
                                contentTypeNames.includes(vk) ||  // Original case: Author, Product, etc.
                                contentTypeNames.some(ct => snakeToCamel(vk) === ct)  // Snake case: author -> Author
                            );

                            if (specifiedType && valueAsObj[specifiedType]) {
                                // User specified a type-specific filter: field: { TypeName: { ... } } or { type_name: { ... } }
                                // Normalize the type name to original case for the filter key
                                const normalizedType = contentTypeNames.includes(specifiedType)
                                    ? specifiedType
                                    : snakeToCamel(specifiedType);
                                const newKey = `${key}_${normalizedType}_filter`;
                                result[newKey] = transformReferenceFilters(valueAsObj[specifiedType], referenceMap, depth + 1);
                            } else {
                                // No type specified, use first available type or treat as direct filter
                                const contentTypeName = contentTypeNames[0];
                                const newKey = `${key}_${contentTypeName}_filter`;
                                result[newKey] = value && typeof value === "object"
                                    ? transformReferenceFilters(value, referenceMap, depth + 1)
                                    : value;
                            }
                        }
                    } else {
                        // Regular field
                        result[key] = value && typeof value === "object"
                            ? transformReferenceFilters(value, referenceMap, depth + 1)
                            : value;
                    }
                }
                return result;
            };

            backendFilters = transformReferenceFilters(backendFilters, fieldReferenceMap);
        } catch (error) {
            if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
            // If inspection fails, log but continue with the original filters
            console.warn('Failed to transform reference field filters:', error);
        }

        const reqBody: any = {
            type: contentTypeDef.__definition.name,
            op_type: 'get_entries',
            api_type,
            limit,
            offset,
            filters: backendFilters,
            preload: normalizePreload(preload),
            sort: sort.map(([field, direction]: [string, 'ASC' | 'DESC']) => [camelToSnake(field), direction]),
            return_count: optReturnCount || undefined,
            keyset: options.keyset, after: options.after, before: options.before, count_limit: options.countLimit,
            images: options.images,
            videos: options.videos,
        };
        return reqBody;
};

const getEntries = (request: Request) =>
    async <T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> }, const P extends PreloadSpec<T> | undefined = undefined, RC extends boolean = false, KS extends boolean = false>(
        contentTypeDef: T,
        options: GetEntriesOptions<T, P, RC, KS> = {}
    ): Promise<
        (RC extends true
            ? EntriesResponseWithCount<BuildEntryFromFieldsWithPreload<T['__fields'], P>>
            : EntriesResponse<BuildEntryFromFieldsWithPreload<T['__fields'], P>>) &
        (KS extends true ? { pageInfo: EntryPageInfo } : {})
    > => {
        validatePagination(options);
        const optReturnCount = options.returnCount;
        const reqBody = await prepareEntriesQuery(request, contentTypeDef, options);
        try { debug('[getEntries] request body:', JSON.stringify(reqBody, null, 2)); } catch (e) { }
        const resp = await request<any[]>(reqBody as any, options);

        try { debug('[getEntries] raw response:', JSON.stringify(resp, null, 2)); } catch (e) { }

        // When return_count is true, backend responds with { data: { entries: [...], count: N } }
        // instead of the default { data: [...entries] }.
        const rawData = (resp as any).data;
        let rawEntries: any[];
        let count: number | undefined;

        if ((optReturnCount || options.keyset) && rawData && !Array.isArray(rawData)) {
            rawEntries = rawData.entries || [];
            count = rawData.count;
        } else {
            rawEntries = rawData || [];
        }

        if (options.countLimit !== undefined && (typeof count !== 'number' || typeof rawData.count_is_exact !== 'boolean')) {
            throw new ApiError('Invalid API response: capped count metadata is missing');
        }

        // Normalize field names from snake_case to camelCase
        const normalizedEntries = rawEntries.map((entry: any) => normalizeReadEntry(entry, reqBody.preload)) as Array<BuildEntryFromFieldsWithPreload<T['__fields'], P>>;

        // Rely on server-side preload expansion for get_entries responses. Client-side per-entry
        // expansion/fetching has been removed to avoid extra round-trips.

        if (optReturnCount) {
            return {
                ...resp,
                data: normalizedEntries,
                count: count ?? 0,
                ...(typeof rawData?.count_is_exact === 'boolean' ? { countIsExact: rawData.count_is_exact } : {}),
                ...(options.keyset ? { pageInfo: readPageInfo(rawData.page_info) } : {}),
            } as any;
        }

        return {
            ...resp,
            data: normalizedEntries,
            ...(options.keyset ? { pageInfo: readPageInfo(rawData.page_info) } : {}),
        } as any;
    };

const sync = (request: Request) => {
    return async (
        contentTypes: (ContentTypeDefinition | { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> })[],
        options: SyncOptions = {}
    ): Promise<SyncResult> => {
        const {
            fetchRemote,
            createContentType,
            dryRun = true,
            createMissing = true,
        } = options;

        // Normalize content types: extract definition from branded types
        const normalizedContentTypes = contentTypes.map(ct => {
            if ('__definition' in ct) {
                return ct.__definition;
            }
            return ct;
        }) as ContentTypeDefinition[];

        try {
            debug('[syncWithFields] normalizedContentTypes:', normalizedContentTypes.map(ct => ct.name));
        } catch (e) {
            // ignore
        }

        const remoteInspect = await inspect(request)(options);

        // Build remote content type map from inspect response
        // First, create a mapping of content type IDs to names
        const contentTypeIdToName = new Map<string, string>();
        const contentTypeNameToId = new Map<string, string>();
        if (remoteInspect) {
            remoteInspect.data.content_types.forEach(ct => {
                // Prefer the slug when available; fallback to id
                const name = (ct as any).slug || ct.id;
                contentTypeIdToName.set(ct.id, name);
                contentTypeNameToId.set(name, ct.id);
            });
        }

        const remoteMap = new Map<string, {
            id: string;
            fields: Map<string, {
                id: string;
                slug: string; // snake_case slug from remote
                type: FieldType;
                is_label: boolean;
                required: boolean;
                reference_types?: string[];
            }>;
        }>();

        if (remoteInspect) {
            remoteInspect.data.content_types.forEach(ct => {
                const fieldsMap = new Map<string, any>();
                ct.fields.forEach(f => {
                    // Convert reference type IDs to names
                    const referenceNames = (f.meta?.reference_types || [])
                        .map(refId => contentTypeIdToName.get(refId) || refId)
                        .filter(Boolean);

                    // Use slug (in snake_case) as the key, as it comes from the remote
                    fieldsMap.set(f.slug, {
                        id: f.id,
                        slug: f.slug,
                        type: f.type,
                        is_label: f.is_label,
                        required: f.required,
                        reference_types: referenceNames,
                    });
                });
                const name = (ct as any).slug || ct.id;
                remoteMap.set(name, {
                    id: ct.id,
                    fields: fieldsMap,
                });
            });
        }

        const actions: SyncAction[] = [];

        for (const ct of normalizedContentTypes) {
            const remoteContentType = remoteMap.get(ct.name);

            if (!remoteContentType) {
                // Content type missing remotely
                if (createMissing && createContentType) {
                    try {
                        if (!dryRun) await createContentType(ct);
                        actions.push({ type: 'create', contentType: ct.name, detail: { reason: 'missing_content_type', contentType: ct } });
                    } catch (e) {
                        actions.push({ type: 'mismatch', contentType: ct.name, detail: { reason: 'create_failed', error: String(e) } });
                    }
                } else {
                    actions.push({ type: 'skip', contentType: ct.name, detail: { reason: 'missing_content_type' } });
                }
                continue;
            }

            // Content type exists, check fields
            const fieldDiffs: any[] = [];
            const remoteFields = remoteContentType.fields;
            const desiredFields = ct.fields || {};

            // Check for missing fields in remote
            for (const [fname, fdef] of Object.entries(desiredFields)) {
                // Convert camelCase field name to snake_case to match remote slugs
                const remoteFieldSlug = camelToSnake(fname);
                const remoteField = remoteFields.get(remoteFieldSlug);

                if (!remoteField) {
                    fieldDiffs.push({
                        field: fname,
                        reason: 'missing_field',
                        desired: {
                            type: fdef.type,
                            required: fdef.required ?? false,
                            isLabel: fdef.isLabel ?? false,
                        }
                    });
                    continue;
                }

                // Field exists, check for changes
                const changes: any = {};

                // Check type mismatch
                if (remoteField.type !== fdef.type) {
                    changes.type = {
                        existing: remoteField.type,
                        desired: fdef.type,
                    };
                }

                // Check required mismatch
                const desiredRequired = fdef.required ?? false;
                if (remoteField.required !== desiredRequired) {
                    changes.required = {
                        existing: remoteField.required,
                        desired: desiredRequired,
                    };
                }

                // Check isLabel mismatch
                const desiredIsLabel = fdef.isLabel ?? false;
                if (remoteField.is_label !== desiredIsLabel) {
                    changes.isLabel = {
                        existing: remoteField.is_label,
                        desired: desiredIsLabel,
                    };
                }

                // Check references for reference types
                if ((fdef.type === 'reference' || fdef.type === 'reference[]') && fdef.references) {
                    const desiredReferences = fdef.references
                        .map(ref => typeof ref === 'string' ? ref : ref.__definition.name)
                        .sort();
                    const existingReferences = (remoteField.reference_types || []).sort();

                    if (JSON.stringify(desiredReferences) !== JSON.stringify(existingReferences)) {
                        changes.references = {
                            existing: existingReferences,
                            desired: desiredReferences,
                        };
                    }
                }

                if (Object.keys(changes).length > 0) {
                    fieldDiffs.push({
                        field: fname,
                        reason: 'field_changes',
                        changes,
                    });
                }
            }

            // Check for extra fields in remote that aren't in desired
            for (const [remoteFieldSlug, remoteField] of remoteFields) {
                // Convert snake_case slug back to camelCase to check against local field names
                const camelCaseFieldName = snakeToCamel(remoteFieldSlug);
                if (!(camelCaseFieldName in desiredFields)) {
                    fieldDiffs.push({
                        field: remoteFieldSlug,
                        reason: 'extra_field_remote',
                        existing: {
                            type: remoteField.type,
                            required: remoteField.required,
                            isLabel: remoteField.is_label,
                        }
                    });
                }
            }

            if (fieldDiffs.length === 0) {
                actions.push({ type: 'noop', contentType: ct.name });
            } else {
                actions.push({ type: 'mismatch', contentType: ct.name, detail: { fieldDiffs } });
            }
        }

        return { actions };
    }
}

/**
 * Enhanced sync function that can create, update, and delete fields in addition to content types.
 * This version works with the backend API and supports full field synchronization.
 */
const syncWithFields = (request: Request) => {
    return async (
        contentTypes: (ContentTypeDefinition | { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> })[],
        options: SyncOptions = {}
    ): Promise<SyncResult> => {
        const {
            createContentType,
            createField,
            updateField,
            deleteField,
            dryRun = true,
            createMissing = true,
            createMissingFields = true,
            updateFields = true,
            deleteExtraFields = false,
        } = options;

        // Normalize content types: extract definition from branded types
        const normalizedContentTypes = contentTypes.map(ct => {
            if ('__definition' in ct) {
                return ct.__definition;
            }
            return ct;
        }) as ContentTypeDefinition[];

        let remoteInspect = await inspect(request)(options);

        // Build remote content type mappings
        const contentTypeIdToName = new Map<string, string>();
        const contentTypeNameToId = new Map<string, string>();
        if (remoteInspect) {
            remoteInspect.data.content_types.forEach(ct => {
                // Use slug when available, otherwise fall back to id.
                const name = (ct as any).slug || ct.id;
                contentTypeIdToName.set(ct.id, name);
                contentTypeNameToId.set(name, ct.id);
            });
        }

        const remoteMap = new Map<string, {
            id: string;
            fields: Map<string, {
                id: string;
                slug: string;
                type: FieldType;
                is_label: boolean;
                required: boolean;
                reference_types?: string[];
                options?: string[];
            }>;
        }>();

        if (remoteInspect) {
            remoteInspect.data.content_types.forEach(ct => {
                const fieldsMap = new Map<string, any>();
                ct.fields.forEach(f => {
                    const referenceNames = (f.meta?.reference_types || [])
                        .map(refId => contentTypeIdToName.get(refId) || refId)
                        .filter(Boolean);

                    fieldsMap.set(f.slug, {
                        id: f.id,
                        slug: f.slug,
                        type: f.type,
                        is_label: f.is_label,
                        required: f.required,
                        reference_types: referenceNames,
                        options: f.options,
                    });
                });

                const name = (ct as any).slug || ct.id;
                remoteMap.set(name, {
                    id: ct.id,
                    fields: fieldsMap,
                });
            });
        }

        try {
            debug('[syncWithFields] remoteMap keys:', Array.from(remoteMap.keys()));
        } catch (e) { }

        const actions: SyncAction[] = [];

        // ============================================
        // PHASE 1: Create all missing content types first
        // ============================================
        for (const ct of normalizedContentTypes) {
            const remoteContentType = remoteMap.get(ct.name);

            if (!remoteContentType) {
                // Content type missing remotely
                if (createMissing && createContentType) {
                    try {
                        if (!dryRun) await createContentType(ct);
                        actions.push({ type: 'create', contentType: ct.name, detail: { reason: 'missing_content_type' } });
                        if (dryRun) {
                            // Plan fields for newly created types without issuing mutations.
                            contentTypeNameToId.set(ct.name, ct.name);
                            remoteMap.set(ct.name, { id: ct.name, fields: new Map() });
                        }
                    } catch (e) {
                        actions.push({ type: 'mismatch', contentType: ct.name, detail: { reason: 'create_failed', error: String(e) } });
                    }
                } else {
                    actions.push({ type: 'skip', contentType: ct.name, detail: { reason: 'missing_content_type' } });
                }
            }
        }

        // ============================================
        // PHASE 2: Refresh inspect if we created content types
        // ============================================
        if (!dryRun && actions.some(action => action.type === 'create')) {
            remoteInspect = await inspect(request)(options);
            // Rebuild the mapping with fresh data
            contentTypeIdToName.clear();
            contentTypeNameToId.clear();
            if (remoteInspect) {
                remoteInspect.data.content_types.forEach(ct => {
                    const name = (ct as any).slug || ct.id;
                    contentTypeIdToName.set(ct.id, name);
                    contentTypeNameToId.set(name, ct.id);
                });
            }
            // Rebuild remoteMap
            remoteMap.clear();
            if (remoteInspect) {
                remoteInspect.data.content_types.forEach(ct => {
                    const fieldsMap = new Map<string, any>();
                    ct.fields.forEach(f => {
                        const referenceNames = (f.meta?.reference_types || [])
                            .map(refId => contentTypeIdToName.get(refId) || refId)
                            .filter(Boolean);

                        fieldsMap.set(f.slug, {
                            id: f.id,
                            slug: f.slug,
                            type: f.type,
                            is_label: f.is_label,
                            required: f.required,
                            reference_types: referenceNames,
                            options: f.options,
                        });
                    });

                    const name = (ct as any).slug || ct.id;
                    // Use the content type slug/name as the key so lookups by ct.name succeed
                    remoteMap.set(name, {
                        id: ct.id,
                        fields: fieldsMap,
                    });
                });
            }
        }
        // ============================================
        // PHASE 3: Now process fields with complete mapping
        // ============================================
        try {
            debug('[syncWithFields] starting field checks for', normalizedContentTypes.map(ct => ct.name));
        } catch (e) { }
        for (const ct of normalizedContentTypes) {
            try {
                const remote = remoteMap.get(ct.name);
                debug(`[syncWithFields] checking contentType=${String(ct.name)} (type=${typeof ct.name}, json=${JSON.stringify(ct.name)}) remoteHas=${remoteMap.has(ct.name)}`);
            } catch (e) { }
            const remoteContentType = remoteMap.get(ct.name);

            if (!remoteContentType) {
                if (actions.some(action => action.type === 'create' && action.contentType === ct.name)) {
                    actions.push({ type: 'mismatch', contentType: ct.name, detail: { message: 'Created content type was not found under its expected slug' } });
                }
                continue;
            }

            // Content type exists, check fields
            const fieldDiffs: FieldDiff[] = [];
            const remoteFields = remoteContentType.fields;
            const desiredFields = ct.fields || {};
            const fieldsToCreate: Array<{ name: string; def: FieldDefinition }> = [];
            const fieldsToUpdate: Array<{ id: string; name: string; changes: Record<string, any> }> = [];
            const fieldsToDelete: string[] = [];

            // Check for missing fields in remote
            for (const [fname, fdef] of Object.entries(desiredFields)) {
                const remoteFieldSlug = camelToSnake(fname);
                const remoteField = remoteFields.get(remoteFieldSlug);

                if (!remoteField) {
                    fieldDiffs.push({
                        field: fname,
                        reason: 'missing_field',
                        desired: {
                            type: fdef.type,
                            required: fdef.required ?? false,
                            isLabel: fdef.isLabel ?? false,
                        }
                    });
                    if (createMissingFields && createField) {
                        fieldsToCreate.push({ name: fname, def: fdef });
                    }
                    continue;
                }

                // Field exists, check for changes
                const changes: any = {};

                if (remoteField.type !== fdef.type) {
                    throw new Error(`Field type mismatch for field "${fname}" in content type "${ct.name}". Remote type: "${remoteField.type}", Desired type: "${fdef.type}". Field types cannot be changed once created.`);
                }

                const desiredRequired = fdef.required ?? false;
                if (remoteField.required !== desiredRequired) {
                    changes.required = {
                        existing: remoteField.required,
                        desired: desiredRequired,
                    };
                }

                const desiredIsLabel = fdef.isLabel ?? false;
                if (remoteField.is_label !== desiredIsLabel) {
                    changes.isLabel = {
                        existing: remoteField.is_label,
                        desired: desiredIsLabel,
                    };
                }
                const desiredOptions = fdef.options

                const remoteOptions = remoteField.options;
                const remoteOptionsMap = Object.fromEntries((remoteOptions || []).map((opt: string) => [opt, true]));

                let optionsChanged = false;
                if ((desiredOptions || []).length !== (remoteOptions || []).length) {
                    optionsChanged = true;
                } else {
                    for (const opt of desiredOptions || []) {
                        if (!remoteOptionsMap[opt]) {
                            optionsChanged = true;
                            break;
                        }
                    }
                }

                if (optionsChanged) {
                    changes.options = {
                        existing: remoteOptions,
                        desired: desiredOptions,
                    };
                }

                if ((fdef.type === 'reference' || fdef.type === 'reference[]') && fdef.references) {
                    const desiredReferences = fdef.references
                        .map(ref => typeof ref === 'string' ? ref : ref.__definition.name)
                        .sort();
                    const existingReferences = (remoteField.reference_types || []).sort();

                    if (JSON.stringify(desiredReferences) !== JSON.stringify(existingReferences)) {
                        changes.references = {
                            existing: existingReferences,
                            desired: desiredReferences,
                        };
                    }
                }

                if (Object.keys(changes).length > 0) {
                    fieldDiffs.push({
                        field: fname,
                        reason: 'field_changes',
                        changes,
                    });
                    if (updateFields && updateField) {
                        const updateChanges: {
                            required?: boolean;
                            description?: string;
                            isLabel?: boolean;
                            options?: string[];
                            references?: string[];
                        } = {
                            required: desiredRequired,
                            description: fdef.settings?.description,
                        };

                        if (changes.options) {
                            updateChanges.options = desiredOptions ? [...desiredOptions] : undefined;
                        }
                        if (changes.isLabel) {
                            updateChanges.isLabel = desiredIsLabel;
                        }

                        // Include reference types if the field is a reference type and references are defined
                        if ((fdef.type === 'reference' || fdef.type === 'reference[]') && fdef.references && changes.references) {
                            updateChanges.references = fdef.references
                                .map(ref => typeof ref === 'string' ? ref : ref.__definition.name);
                        }

                        fieldsToUpdate.push({
                            id: remoteField.id,
                            name: fname,
                            changes: updateChanges,
                        });
                    }
                }
            }

            // Match canonical slugs so PascalCase definitions cannot delete their own fields.
            const desiredSlugs = new Set(Object.keys(desiredFields).map(camelToSnake));
            for (const [remoteFieldSlug, remoteField] of remoteFields) {
                if (!desiredSlugs.has(remoteFieldSlug) && deleteExtraFields) {
                    fieldDiffs.push({
                        field: remoteFieldSlug,
                        reason: 'extra_field_remote',
                        existing: {
                            type: remoteField.type,
                            required: remoteField.required,
                            isLabel: remoteField.is_label,
                        }
                    });
                    if (deleteExtraFields && deleteField) {
                        fieldsToDelete.push(remoteField.id);
                    }
                }
            }

            // Count only completed writes (or planned writes during dry-run).
            let created = dryRun ? fieldsToCreate.length : 0;
            let updated = dryRun ? fieldsToUpdate.length : 0;
            let deleted = dryRun ? fieldsToDelete.length : 0;
            const failures: string[] = [];
            if (fieldsToCreate.length > 0 && !dryRun) {
                for (const { name, def } of fieldsToCreate) {
                    try {
                        // Resolve reference names to IDs for the callback
                        const defWithResolvedReferences = { ...def };
                        if ((def.type === 'reference' || def.type === 'reference[]') && def.references) {
                            defWithResolvedReferences.references = def.references
                                .map(ref => {
                                    const refName = typeof ref === 'string' ? ref : ref.__definition.name;
                                    return contentTypeNameToId.get(refName) || refName;
                                })
                                .filter(Boolean) as any[];
                        }
                        await createField!(remoteContentType.id, name, defWithResolvedReferences);
                        created++;
                    } catch (e) {
                        failures.push(`Create field ${name}: ${String(e)}`);
                    }
                }
            }

            if (fieldsToUpdate.length > 0 && !dryRun) {
                for (const { id, changes } of fieldsToUpdate) {
                    try {
                        // Resolve reference names to IDs if needed
                        const resolvedChanges = { ...changes };
                        if (resolvedChanges.references && Array.isArray(resolvedChanges.references)) {
                            resolvedChanges.references = resolvedChanges.references
                                .map(ref => contentTypeNameToId.get(ref) || ref)
                                .filter(Boolean);
                        }
                        await updateField!(id, resolvedChanges);
                        updated++;
                    } catch (e) {
                        failures.push(`Update field ${id}: ${String(e)}`);
                    }
                }
            }

            if (fieldsToDelete.length > 0 && !dryRun) {
                for (const id of fieldsToDelete) {
                    try {
                        await deleteField!(id);
                        deleted++;
                    } catch (e) {
                        failures.push(`Delete field ${id}: ${String(e)}`);
                    }
                }
            }

            if (failures.length) {
                actions.push({ type: 'mismatch', contentType: ct.name, detail: { message: failures.join('; '), fieldDiffs } });
            }
            if (created) actions.push({ type: 'create_fields', contentType: ct.name, detail: { fieldDiffs, created } });
            if (updated) actions.push({ type: 'update_fields', contentType: ct.name, detail: { fieldDiffs, updated } });
            if (deleted) actions.push({ type: 'delete_fields', contentType: ct.name, detail: { fieldDiffs, deleted } });
            if (!fieldDiffs.length) actions.push({ type: 'noop', contentType: ct.name });
            else if (!failures.length && !created && !updated && !deleted) {
                actions.push({ type: 'mismatch', contentType: ct.name, detail: { fieldDiffs } });
            }
        }

        // Debug: when running a non-dry run from CLI show resolved actions for visibility
        try {
            if (actions && actions.length > 0) {
                debug('[syncWithFields] Resolved actions:', JSON.stringify(actions.map(a => ({ type: a.type, contentType: a.contentType, detail: a.detail })), null, 2));
            } else {
                debug('[syncWithFields] No actions resolved');
            }
        } catch (e) {
            // swallow JSON errors
        }

        return { actions };
    }
}

/**
 * Define a content type with full type safety and field preservation
 * 
 * Creates a branded type that preserves field schema information for the CLI tools.
 * Can be used directly in config files or with the generic API methods.
 * 
 * Example:
 *   const Author = defineContentType({
 *       name: 'author',
 *       displayName: 'Author',
 *       fields: {
 *           id: { type: 'string', required: true },
 *           name: { type: 'string', required: true },
 *           status: { type: 'string', options: ['active', 'inactive'] },
 *       }
 *   });
 *   
 *   const Article = defineContentType({
 *       name: 'article',
 *       fields: {
 *           author: { type: 'reference', references: [Author] }
 *       }
 *   });
 * 
 * Usage:
 *   - In config files: export default { contentTypes: [Author, Article] };
 *   - Type checking done through the returned BrandedContentType
 */

/**
 * Upload a file (image or video) to the backend
 */
const upload = (options: InitSchema) => async (file: File | Blob, filename?: string, controls: UploadOptions = {}): Promise<UploadedFile> => {
    const { apiToken, workspace, requestTimeoutMs } = options;

    // If Blob is provided, we need a filename
    if (!(file instanceof File) && !filename) {
        throw new Error('Filename is required when uploading a Blob');
    }

    const fname = file instanceof File ? file.name : filename!;

    // Validate file format
    const validation = validateFile(new File([file], fname));
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const strategy = controls.uploadStrategy ?? options.uploadStrategy ?? 'direct';
    if (strategy !== 'direct' && strategy !== 'multipart') throw new Error('Invalid uploadStrategy');
    if (strategy === 'direct') {
        const apiUrl = requestUrl(options, DECOUPLA_API_URL_BASE);
        const timeout = controls.requestTimeoutMs ?? requestTimeoutMs;
        const retries = controls.maxRetries ?? options.maxRetries;
        const jsonRequest = async (body: object) => {
            const response = await apiFetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                body: JSON.stringify(body), signal: controls.signal,
            }, timeout, options.fetch, retries);
            return response.json();
        };
        const prepared = await jsonRequest({ op_type: 'prepare_upload', content_type: uploadContentType(file, fname), byte_size: String(file.size) });
        const staged = prepared.data?.upload;
        if (typeof staged?.upload_id !== 'string' || typeof staged?.url !== 'string' || typeof staged?.content_type !== 'string') {
            throw new ApiError('Invalid prepare-upload response');
        }
        let signedUrl: URL;
        try { signedUrl = new URL(staged.url); } catch { throw new ApiError('Invalid storage upload URL'); }
        if (signedUrl.protocol !== 'https:' || signedUrl.username || signedUrl.password) throw new ApiError('Invalid storage upload URL');
        await storageFetch(staged.url, {
            method: 'PUT', headers: { 'Content-Type': staged.content_type }, body: file,
            credentials: 'omit', redirect: 'error', signal: controls.signal,
        }, timeout, options.fetch);
        const completed = await jsonRequest({ op_type: 'complete_upload', upload_id: staged.upload_id });
        if (typeof completed.data?.file?.id !== 'string') throw new ApiError('Invalid complete-upload response');
        return completed.data.file as UploadedFile;
    }

    // Create FormData
    const formData = new FormData();
    formData.append('op_type', 'upload_file');
    formData.append('file', file, fname);

    // Make the upload request
    const response = await apiFetch(requestUrl(options, DECOUPLA_API_URL_BASE), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
        },
        body: formData,
        signal: controls.signal,
    }, controls.requestTimeoutMs ?? requestTimeoutMs, options.fetch, controls.maxRetries ?? options.maxRetries);

    const respData = await response.json() as any;

    const uploadResponse = respData as UploadFileResponse;
    return uploadResponse.data.file;
};

/**
 * Normalize EntryMetadata field names from snake_case to camelCase
 */
const normalizeEntryMetadata = (entry: EntryMetadata): NormalizedEntryMetadata => ({
    id: entry.id,
    modelId: entry.model_id,
    state: entry.state,
    lastVersion: entry.last_version,
    lastPublishedVersion: entry.last_published_version,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
});

/**
 * Create a new entry (instance of a content type)
 */
// Keep write values from widening the content-type inference (compatible with TypeScript 5.0).
type NoInferContentType<T> = [T][T extends unknown ? 0 : never];

const createEntry = (options: InitSchema) => async <T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> }, const P extends PreloadSpec<T> | undefined = undefined>(
    contentTypeDef: T,
    fieldValues: CreateFieldValues<NoInferContentType<T>>,
    // Backwards-compatible: callers historically passed a boolean `published` as the 3rd arg.
    // New signature accepts an options object { published?, preload? }.
    optionsParam?: boolean | (RequestOptions & {
        published?: boolean;
        preload?: P;
    })
): Promise<
    P extends undefined
        ? NormalizedEntryMetadata
        : { data: BuildEntryFromFieldsWithPreload<T['__fields'], P> & NormalizedEntryMetadata }
> => {
    const { apiToken, workspace, requestTimeoutMs } = options;
    // Normalize optionsParam to the object shape
    const opts = typeof optionsParam === 'boolean' ? { published: optionsParam } : (optionsParam || {});
    const published = opts.published ?? true;

    // Validate and coerce field values against field definitions
    const fieldDefs = contentTypeDef.__definition?.fields || {};
    const normalizedFieldValues = validateAndCoerceFieldValues(fieldValues as FieldValues, fieldDefs, { isCreate: true });

    // Normalize preload shapes to the backend's nested-array grammar (same as getEntry/getEntries)
    const normalizePreload = (p: any): any => {
        if (!Array.isArray(p)) return p;
        const out: any[] = [];
        for (const item of p) {
            if (typeof item === 'string') {
                out.push(camelToSnake(item));
                continue;
            }
            if (!Array.isArray(item)) {
                out.push(item);
                continue;
            }
            const [key, inner] = item;
            // If inner is null/undefined, treat as simple string preload
            if (inner == null) {
                out.push(camelToSnake(key));
                continue;
            }

            // Determine inner as an array of preload items.
            let innerArr: any[];
            if (typeof inner === 'string') {
                innerArr = [inner];
            } else if (Array.isArray(inner)) {
                // If inner looks like a single tuple [string, ...], treat it as one item and wrap it.
                if (inner.length === 2 && typeof inner[0] === 'string' && (Array.isArray(inner[1]) || inner[1] == null)) {
                    innerArr = [inner];
                } else {
                    innerArr = inner;
                }
            } else {
                innerArr = [inner];
            }

            out.push([camelToSnake(key), normalizePreload(innerArr)]);
        }
        return out;
    };

    // Build request
    const requestBody: any = {
        op_type: 'create_entry',
        type: contentTypeDef.__definition.name,
        field_values: normalizedFieldValues,
        published,
    };

    if ((opts as any).preload) {
        requestBody.preload = normalizePreload((opts as any).preload);
    }

    // Make the request
    const response = await apiFetch(requestUrl(options, DECOUPLA_API_URL_BASE), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: opts.signal,
    }, opts.requestTimeoutMs ?? requestTimeoutMs, options.fetch, opts.maxRetries ?? options.maxRetries);

    const respData = await response.json() as any;

    const createResponse = respData as CreateEntryResponse;
    const entry = createResponse.data?.entry;

    // Check if entry is null - this usually means the content type has no fields
    if (!entry) {
        throw new Error(
            `Failed to create entry: Content type "${contentTypeDef.__definition.name}" returned null. ` +
            `This typically means the content type has no fields defined. ` +
            `Please add at least one field to the content type before creating entries.`
        );
    }

    // If preload was requested, return the full normalized entry (snake_case -> camelCase)
    if ((opts as any).preload) {
        const normalized: Record<string, any> = { id: entry.id };
        for (const [key, value] of Object.entries(entry)) {
            if (key !== 'id') {
                normalized[snakeToCamel(key)] = value;
            }
        }
        return { data: normalized } as any;
    }

    return normalizeEntryMetadata(entry) as any;
};

/**
 * Update an existing entry
 */
const updateEntry = (options: InitSchema) => async <T extends { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> }, const P extends PreloadSpec<T> | undefined = undefined>(
    contentTypeDef: T,
    entryId: string,
    fieldValues: UpdateFieldValues<NoInferContentType<T>>,
    // Backwards-compatible: callers historically passed a boolean `published` as the 4th arg.
    // New signature accepts an options object { published?, preload? }.
    optionsParam?: boolean | (RequestOptions & {
        published?: boolean;
        preload?: P;
    })
): Promise<
    P extends undefined
        ? NormalizedEntryMetadata
        : { data: BuildEntryFromFieldsWithPreload<T['__fields'], P> & NormalizedEntryMetadata }
> => {
    const { apiToken, workspace, requestTimeoutMs } = options;

    // Validate entry ID
    if (!isValidUUID(entryId)) {
        throw new Error(`Invalid entry ID format: ${entryId}. Must be a valid UUID.`);
    }

    // Validate and coerce field values against field definitions
    const fieldDefs = contentTypeDef.__definition?.fields || {};
    const normalizedFieldValues = validateAndCoerceFieldValues(fieldValues as FieldValues, fieldDefs, { isCreate: false });

    // Build request
    const requestBody: any = {
        op_type: 'update_entry',
        entry_id: entryId,
        field_values: normalizedFieldValues,
    };

    // Normalize optionsParam to the object shape (back-compat boolean -> published)
    const opts = typeof optionsParam === 'boolean' ? { published: optionsParam } : (optionsParam || {});

    // Add published if specified
    if ((opts as any).published !== undefined) {
        requestBody.published = (opts as any).published;
    }

    // Normalize preload shapes to the backend's nested-array grammar (same as getEntry/getEntries)
    const normalizePreload = (p: any): any => {
        if (!Array.isArray(p)) return p;
        const out: any[] = [];
        for (const item of p) {
            if (typeof item === 'string') {
                out.push(camelToSnake(item));
                continue;
            }
            if (!Array.isArray(item)) {
                out.push(item);
                continue;
            }
            const [key, inner] = item;
            if (inner == null) {
                out.push(camelToSnake(key));
                continue;
            }
            let innerArr: any[];
            if (typeof inner === 'string') {
                innerArr = [inner];
            } else if (Array.isArray(inner)) {
                if (inner.length === 2 && typeof inner[0] === 'string' && (Array.isArray(inner[1]) || inner[1] == null)) {
                    innerArr = [inner];
                } else {
                    innerArr = inner;
                }
            } else {
                innerArr = [inner];
            }
            out.push([camelToSnake(key), normalizePreload(innerArr)]);
        }
        return out;
    };

    if ((opts as any).preload) {
        requestBody.preload = normalizePreload((opts as any).preload);
    }

    // Make the request
    const response = await apiFetch(requestUrl(options, DECOUPLA_API_URL_BASE), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: opts.signal,
    }, opts.requestTimeoutMs ?? requestTimeoutMs, options.fetch, opts.maxRetries ?? options.maxRetries);

    const respData = await response.json() as any;

    const updateResponse = respData as UpdateEntryResponse;
    const entry = updateResponse.data?.entry;

    // Check if entry is null - this usually means the content type has no fields
    if (!entry) {
        throw new Error(
            `Failed to update entry: Entry ID "${entryId}" returned null. ` +
            `This typically means the content type has no fields defined. ` +
            `Please ensure the content type has at least one field.`
        );
    }

    // If preload was requested, return the full normalized entry (snake_case -> camelCase)
    if ((opts as any).preload) {
        const normalized: Record<string, any> = { id: entry.id };
        for (const [key, value] of Object.entries(entry)) {
            if (key !== 'id') {
                normalized[snakeToCamel(key)] = value;
            }
        }
        return { data: normalized } as any;
    }

    return normalizeEntryMetadata(entry) as any;
};

/**
 * Delete a content type by ID
 */
const updateEntries = (config: InitSchema) =>
    async <T extends BrandedContentType<any>, const P extends PreloadSpec<T> | undefined = undefined>(
        contentTypeDef: T,
        options: UpdateEntriesOptions<NoInferContentType<T>, P>
    ): Promise<UpdateEntriesResponse<BuildEntryFromFieldsWithPreload<T['__fields'], P> & NormalizedEntryMetadata>> => {
        if (!options?.filters || typeof options.filters !== 'object' || Array.isArray(options.filters)) {
            throw new Error('updateEntries requires an explicit filters object; use {} to select all entries');
        }
        const fieldValues = validateAndCoerceFieldValues(options.values as FieldValues, contentTypeDef.__fields, { isCreate: false });
        const reqBody = await prepareEntriesQuery(makeRequest(config), contentTypeDef, { ...options, limit: options.limit ?? 1000 });
        requestSchema.parse(reqBody);
        reqBody.sort = reqBody.sort.map(([field, direction]: [string, string]) => ({ field, direction }));
        reqBody.op_type = 'update_entry';
        reqBody.field_values = fieldValues;
        reqBody.published = options.published ?? true;
        delete reqBody.return_count;
        const response = await apiFetch(requestUrl(config, DECOUPLA_API_URL_BASE), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiToken}` },
            body: JSON.stringify(reqBody), signal: options.signal,
        }, options.requestTimeoutMs ?? config.requestTimeoutMs, config.fetch, options.maxRetries ?? config.maxRetries);
        const body = await response.json();
        const data = body.data;
        if (!Array.isArray(data?.entries) || !Number.isInteger(data.updated_count) || !Number.isInteger(data.failed_count) || !Array.isArray(data.errors)) {
            throw new ApiError('Invalid bulk update response');
        }
        return {
            data: data.entries.map((entry: any) => normalizeReadEntry(entry, reqBody.preload)),
            updatedCount: data.updated_count, failedCount: data.failed_count, errors: data.errors,
        };
    };

const deleteContentType = (options: InitSchema) => async (contentTypeId: string, controls: RequestOptions = {}): Promise<void> => {
    const { apiToken, workspace, requestTimeoutMs } = options;

    // Validate content type ID
    if (!isValidUUID(contentTypeId)) {
        throw new Error(`Invalid content type ID format: ${contentTypeId}. Must be a valid UUID.`);
    }

    const requestBody = {
        op_type: 'delete_content_type',
        content_type_id: contentTypeId,
    };

    const response = await apiFetch(requestUrl(options, DECOUPLA_API_URL_BASE), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controls.signal,
    }, controls.requestTimeoutMs ?? requestTimeoutMs, options.fetch, controls.maxRetries ?? options.maxRetries);

    const respData = await response.json() as any;


};

export const createClient = (config: InitSchema) => {
    const clientOptions = initSchema.parse(config);
    const { apiToken, workspace, requestTimeoutMs } = clientOptions;
    const request = makeRequest(clientOptions);

    // Remote mutation helpers used by syncWithFields when invoked from the CLI.
    const createContentTypeRemote = async (ct: ContentTypeDefinition, controls: RequestOptions = {}) => {
        const reqBody = buildCreateContentTypeRequest(ct);
        debug('[sync] createContentType request:', JSON.stringify(reqBody));
        const resp = await apiFetch(requestUrl(clientOptions, DECOUPLA_API_URL_BASE), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
            },
            body: JSON.stringify(reqBody),
            signal: controls.signal,
        }, controls.requestTimeoutMs ?? requestTimeoutMs, clientOptions.fetch, controls.maxRetries ?? clientOptions.maxRetries);
        const data = await resp.json();
        debug('[sync] createContentType response:', JSON.stringify(data));
        return data;
    };

    const createFieldRemote = async (modelId: string, fieldName: string, fieldDef: FieldDefinition, controls: RequestOptions = {}) => {
        const reqBody = buildCreateFieldRequest(modelId, fieldName, fieldDef);
        debug('[sync] createField request:', JSON.stringify(reqBody));
        const resp = await apiFetch(requestUrl(clientOptions, DECOUPLA_API_URL_BASE), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
            },
            body: JSON.stringify(reqBody),
            signal: controls.signal,
        }, controls.requestTimeoutMs ?? requestTimeoutMs, clientOptions.fetch, controls.maxRetries ?? clientOptions.maxRetries);
        const data = await resp.json();
        debug('[sync] createField response for', fieldName, JSON.stringify(data));
        return data;
    };

    const updateFieldRemote = async (fieldId: string, changes: Record<string, any>, controls: RequestOptions = {}) => {
        const reqBody = buildUpdateFieldRequest(fieldId, changes);
        debug('[sync] updateField request:', JSON.stringify(reqBody));
        const resp = await apiFetch(requestUrl(clientOptions, DECOUPLA_API_URL_BASE), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
            },
            body: JSON.stringify(reqBody),
            signal: controls.signal,
        }, controls.requestTimeoutMs ?? requestTimeoutMs, clientOptions.fetch, controls.maxRetries ?? clientOptions.maxRetries);
        const data = await resp.json();
        debug('[sync] updateField response for', fieldId, JSON.stringify(data));
        return data;
    };

    const deleteFieldRemote = async (fieldId: string, controls: RequestOptions = {}) => {
        const reqBody = { op_type: 'delete_field', field_id: fieldId };
        const resp = await apiFetch(requestUrl(clientOptions, DECOUPLA_API_URL_BASE), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
            },
            body: JSON.stringify(reqBody),
            signal: controls.signal,
        }, controls.requestTimeoutMs ?? requestTimeoutMs, clientOptions.fetch, controls.maxRetries ?? clientOptions.maxRetries);
        const data = await resp.json();
        return data;
    };

    // Bind syncWithFields so CLI callers get working remote mutation callbacks by default.
    const syncWithFieldsBound = async (
        contentTypes: Parameters<ReturnType<typeof syncWithFields>>[0],
        options: Parameters<ReturnType<typeof syncWithFields>>[1] = {}
    ) => {
        const defaults = {
            createContentType: (ct: ContentTypeDefinition) => createContentTypeRemote(ct, options),
            createField: (id: string, name: string, def: FieldDefinition) => createFieldRemote(id, name, def, options),
            updateField: (id: string, changes: Record<string, any>) => updateFieldRemote(id, changes, options),
            deleteField: (id: string) => deleteFieldRemote(id, options),
        } as any;

        // Merge provided options over defaults so caller can override
        const merged = { ...defaults, ...options };

        return syncWithFields(request)(contentTypes as any, merged as any);
    };

    return {
        getEntry: getEntry(request),
        getEntryOrThrow: getEntryOrThrow(request),
        iterateEntries: iterateEntries(request),
        getAllEntries: getAllEntries(request),
        getEntries: getEntries(request),
        // Note: inline preload literal inference is supported by getEntries overloads.
        inspect: inspect(request),
        /**
         * Check read access. Returns false for denied access or an empty workspace,
         * where the requested view cannot be verified. Other failures are thrown.
         */
        validateContentView: async (view: 'live' | 'preview', controls: RequestOptions = {}): Promise<boolean> => {
            try {
                const inspectResp = await inspect(request)(controls);
                const firstCT = inspectResp.data.content_types[0];
                if (!firstCT) return false;
                await request({ op_type: 'get_entries', type: firstCT.slug || firstCT.id, limit: 1, api_type: view }, controls);
                return true;
            } catch (error) {
                if (error instanceof ApiError && error.isAuthorizationError) return false;
                throw error;
            }
        },
        sync: sync(request),
        syncWithFields: syncWithFieldsBound,
        updateEntries: updateEntries(clientOptions),
        upload: upload(clientOptions),
        createEntry: createEntry(clientOptions),
        updateEntry: updateEntry(clientOptions),
        deleteContentType: deleteContentType(clientOptions),
    };
};

/**
 * Utility: safely get an entry ID whether the field is a raw id string or an expanded object
 * Returns empty string for invalid inputs.
 */
export const getEntryId = (entry: unknown): string => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object' && 'id' in (entry as any)) return (entry as any).id as string;
    return '';
};

/**
 * Type guard: true when the value is an expanded entry object with an `id` property
 */
export const isExpandedEntry = <T extends { id: string } = { id: string }>(value: unknown): value is T => {
    return !!(value && typeof value === 'object' && 'id' in (value as any));
};

// Re-export types and utilities
export { defineContentType, defineConfig } from './types';
