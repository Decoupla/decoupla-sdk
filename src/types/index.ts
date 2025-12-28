// --- API Response Types ---
export type EntryResponse<T> = {
    data: {
        node: T;
    },
}

export type InspectResponse = {
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
                is_label: boolean;
                required: boolean;
            }>
        }>
    }
}

export type EntriesResponse<T> = {
    data: T[];
}

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
    output: {
        url: string;
    };
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
    options?: string[];
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

export type SyncOptions = {
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
