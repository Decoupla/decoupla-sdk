// --- API Response Types ---
export type ApiType = 'live' | 'preview';

export type EntryResponse<T> = {
    api_type?: ApiType;
    data: {
        node?: T | null;
        entry?: T | null; // some responses historically use `entry`
    },
}

export type InspectResponse = {
    api_type?: ApiType;
    data: {
        content_types: Array<{
            id: string;
            slug?: string;
            fields: Array<{
                id: string;
                slug: string; // snake_case field name
                meta?: {
                    reference_types: string[];
                }
                type: FieldType;
                options?: string[];
                is_label: boolean;
                required: boolean;
            }>
        }>
    }
}

export type EntriesResponse<T> = {
    api_type?: ApiType;
    data: T[]
}

export type EntriesResponseWithCount<T> = {
    api_type?: ApiType;
    data: T[];
    count: number;
    countIsExact?: boolean;
}

export type EntryPageInfo = {
    startCursor: string | null;
    endCursor: string | null;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
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
}

// --- Field Value Types ---
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
    output: { url: string };
    thumbnail: ImageObject | null;
};

export type TextObject = {
    content: string;
};

// --- Content Type Definition Types ---
export type PrimitiveFieldType =
    | 'string'
    | 'string[]'
    | 'text'
    | 'slug'
    | 'int'
    | 'int[]'
    | 'float'
    | 'float[]'
    | 'boolean'
    | 'boolean[]'
    | 'date'
    | 'time'
    | 'datetime'
    | 'json'
    | 'image'
    | 'image[]'
    | 'video'
    | 'video[]';

export type ReferenceFieldType = 'reference' | 'reference[]';

export type FieldType = PrimitiveFieldType | ReferenceFieldType;

export type ReferenceTarget = string | { __isContentTypeDefinition: true; __definition: ContentTypeDefinition; __fields: Record<string, FieldDefinition> };

export type FieldDefinition = {
    type: FieldType;
    required?: boolean;
    // only valid for string/string[] types - constrains values to specific options
    options?: readonly string[];
    // only valid for reference/reference[]
    references?: ReferenceTarget[];
    // if true, this field will be used as the label/display name for the content type
    isLabel?: boolean;
    // allow extra settings for future options (localization, validations etc.)
    settings?: Record<string, any>;
}

export type ContentTypeDefinition = {
    name: string;
    displayName?: string;
    description?: string;
    fields: Record<string, FieldDefinition>;
}

// --- Sync Types ---
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
        type?: { existing: FieldType; desired: FieldType };
        required?: { existing: boolean; desired: boolean };
        isLabel?: { existing: boolean; desired: boolean };
        references?: { existing: string[]; desired: string[] };
    };
};

export type SyncOptions = import('../modules/transport').RequestOptions & {
    // If provided, used to fetch the remote content types. If omitted, remote is assumed empty.
    fetchRemote?: () => Promise<ContentTypeDefinition[]>;
    // If provided, called for each content type that needs creation. If omitted, no remote calls are made.
    createContentType?: (ct: ContentTypeDefinition) => Promise<any>;
    // If provided, called to create fields for an existing content type.
    createField?: (modelId: string, fieldName: string, fieldDef: FieldDefinition) => Promise<any>;
    // If provided, called to update fields.
    updateField?: (fieldId: string, changes: Record<string, any>) => Promise<any>;
    // If provided, called to delete fields.
    deleteField?: (fieldId: string) => Promise<any>;
    // If true, do not perform remote mutations even if createContentType/createField is provided.
    dryRun?: boolean;
    // If true, missing content types will be created (if createContentType is present).
    createMissing?: boolean;
    // If true, missing fields will be created (if createField is present).
    createMissingFields?: boolean;
    // If true, field differences will be updated (if updateField is present).
    updateFields?: boolean;
    // If true, extra fields in remote will be deleted (if deleteField is present).
    deleteExtraFields?: boolean;
}

export type SyncAction = {
    type: 'create' | 'create_fields' | 'update_fields' | 'delete_fields' | 'skip' | 'noop' | 'mismatch';
    contentType: string;
    detail?: any;
}

export type SyncResult = {
    actions: SyncAction[];
}

// --- Utility Types ---
export type PreloadField = ([string, PreloadField[]] | string)[];

// --- Generic Type Utilities ---
export type {
    BrandedContentType,
    ExtractFieldSchema,
} from './generics';
export { defineConfig, defineContentType } from './generics';

// Re-export new preload types
export type { PreloadSpec } from './preload';
// makePreloadFor removed; callers should use inline PreloadSpec or cast as needed.

export type { ImageFormat, ImageTransform, ImageOptions, ImageOptionsFor } from './images';

export type { CreateFieldValues, UpdateFieldValues, FieldWriteValue, EntryIdInput, JsonValue } from './writes';
export type { GetEntryOptions, GetEntriesOptions, PaginationOptions, SortField, SortSpec } from './queries';

export type { VideoTransform, VideoOptions, VideoOptionsFor } from './videos';
export type { UpdateEntriesOptions, UpdateEntriesResponse } from './queries';
export type { RequestOptions } from '../modules/transport';
