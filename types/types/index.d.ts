export type ApiType = 'live' | 'preview';
export type EntryResponse<T> = {
    api_type?: ApiType;
    data: {
        node?: T | null;
        entry?: T | null;
    };
};
export type InspectResponse = {
    api_type?: ApiType;
    data: {
        content_types: Array<{
            id: string;
            slug?: string;
            fields: Array<{
                id: string;
                slug: string;
                meta?: {
                    reference_types: string[];
                };
                type: FieldType;
                options?: string[];
                is_label: boolean;
                required: boolean;
            }>;
        }>;
    };
};
export type EntriesResponse<T> = {
    api_type?: ApiType;
    data: T[];
};
export type EntriesResponseWithCount<T> = {
    api_type?: ApiType;
    data: T[];
    count: number;
};
export type ErrorResponse = {
    errors: Array<{
        field: string;
        message: string;
        available_filters?: string[];
        valid_filters?: string[];
        valid_types?: string[];
        valid_controls?: string[];
    }>;
};
export type ImageObject = {
    id: string;
    width: number;
    height: number;
    format: string;
    byte_size: number;
    output: {
        url: string;
        width: number;
        height: number;
        format: string;
        byte_size: number;
    };
};
export type VideoObject = {
    id: string;
    width: number;
    height: number;
    duration: number;
    format: string;
    byte_size: number;
    output: {
        url: string;
    };
    thumbnail: ImageObject | null;
};
export type TextObject = {
    content: string;
};
export type PrimitiveFieldType = 'string' | 'string[]' | 'text' | 'slug' | 'int' | 'int[]' | 'float' | 'float[]' | 'boolean' | 'boolean[]' | 'date' | 'time' | 'datetime' | 'json' | 'image' | 'image[]' | 'video' | 'video[]';
export type ReferenceFieldType = 'reference' | 'reference[]';
export type FieldType = PrimitiveFieldType | ReferenceFieldType;
export type ReferenceTarget = string | {
    __isContentTypeDefinition: true;
    __definition: ContentTypeDefinition;
    __fields: Record<string, FieldDefinition>;
};
export type FieldDefinition = {
    type: FieldType;
    required?: boolean;
    options?: readonly string[];
    references?: ReferenceTarget[];
    isLabel?: boolean;
    settings?: Record<string, any>;
};
export type ContentTypeDefinition = {
    name: string;
    displayName?: string;
    description?: string;
    fields: Record<string, FieldDefinition>;
};
export type FieldDiff = {
    field: string;
    reason: 'missing_field' | 'field_changes' | 'extra_field_remote';
    desired?: {
        type: FieldType;
        required: boolean;
        isLabel: boolean;
    };
    existing?: {
        type: FieldType;
        required: boolean;
        isLabel: boolean;
    };
    changes?: {
        type?: {
            existing: FieldType;
            desired: FieldType;
        };
        required?: {
            existing: boolean;
            desired: boolean;
        };
        isLabel?: {
            existing: boolean;
            desired: boolean;
        };
        references?: {
            existing: string[];
            desired: string[];
        };
    };
};
export type SyncOptions = import('../modules/transport').RequestOptions & {
    fetchRemote?: () => Promise<ContentTypeDefinition[]>;
    createContentType?: (ct: ContentTypeDefinition) => Promise<any>;
    createField?: (modelId: string, fieldName: string, fieldDef: FieldDefinition) => Promise<any>;
    updateField?: (fieldId: string, changes: Record<string, any>) => Promise<any>;
    deleteField?: (fieldId: string) => Promise<any>;
    dryRun?: boolean;
    createMissing?: boolean;
    createMissingFields?: boolean;
    updateFields?: boolean;
    deleteExtraFields?: boolean;
};
export type SyncAction = {
    type: 'create' | 'create_fields' | 'update_fields' | 'delete_fields' | 'skip' | 'noop' | 'mismatch';
    contentType: string;
    detail?: any;
};
export type SyncResult = {
    actions: SyncAction[];
};
export type PreloadField = ([string, PreloadField[]] | string)[];
export type { BrandedContentType, ExtractFieldSchema, } from './generics';
export { defineConfig, defineContentType } from './generics';
export type { PreloadSpec } from './preload';
export type { ImageFormat, ImageTransform, ImageOptions, ImageOptionsFor } from './images';
export type { CreateFieldValues, UpdateFieldValues, FieldWriteValue, EntryIdInput, JsonValue } from './writes';
export type { GetEntryOptions, GetEntriesOptions, PaginationOptions, SortField, SortSpec } from './queries';
export type { VideoTransform, VideoOptions, VideoOptionsFor } from './videos';
export type { UpdateEntriesOptions, UpdateEntriesResponse } from './queries';
export type { RequestOptions } from '../modules/transport';
