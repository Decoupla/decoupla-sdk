import type { FieldType, ContentTypeDefinition, FieldDefinition } from "../types";

/**
 * API Request types for sync operations
 */

export type CreateContentTypeRequest = {
    op_type: 'create_content_type';
    name: string;
    description?: string;
};

export type CreateFieldRequest = {
    op_type: 'create_field';
    content_type_id: string;
    name: string;
    type: string;
    control?: string;
    required?: boolean;
    description?: string;
    meta?: Record<string, any>;
};

export type UpdateFieldRequest = {
    op_type: 'update_field';
    field_id: string;
    name?: string;
    required?: boolean;
    description?: string;
    meta?: Record<string, any>;
};

export type DeleteFieldRequest = {
    op_type: 'delete_field';
    field_id: string;
};

export type DeleteModelRequest = {
    op_type: 'delete_content_type';
    model_id: string;
};

export type ModelRequest =
    | CreateContentTypeRequest
    | CreateFieldRequest
    | UpdateFieldRequest
    | DeleteFieldRequest
    | DeleteModelRequest;

/**
 * API Response types for sync operations
 */

export type CreateContentTypeResponse = {
    data: {
        content_type: {
            id: string;
            name: string;
            slug: string;
            description?: string;
            localizable: boolean;
            project_id: string;
            inserted_at: string;
            updated_at: string;
        };
    };
};

export type CreateFieldResponse = {
    data: {
        field: {
            id: string;
            name: string;
            slug: string;
            type: string;
            control: string;
            required: boolean;
            description?: string;
            model_id: string;
            order: number;
            is_label: boolean;
            inserted_at: string;
            updated_at: string;
        };
    };
};

export type UpdateFieldResponse = {
    data: {
        field: {
            id: string;
            name: string;
            slug: string;
            type: string;
            control: string;
            required: boolean;
            description?: string;
            model_id: string;
            order: number;
            is_label: boolean;
            inserted_at: string;
            updated_at: string;
        };
    };
};

export type DeleteFieldResponse = {
    data: {
        message: string;
    };
};

export type DeleteModelResponse = {
    data: {
        message: string;
    };
};

export type ModelResponse =
    | CreateContentTypeResponse
    | CreateFieldResponse
    | UpdateFieldResponse
    | DeleteFieldResponse
    | DeleteModelResponse
    | ErrorResponse;

export type ErrorResponse = {
    errors: Array<{
        field: string;
        message: string;
        valid_types?: string[];
        valid_controls?: string[];
    }>;
};

/**
 * Map our field types to backend field types
 */
export const fieldTypeMap: Record<FieldType, string> = {
    'string': 'string',
    'string[]': 'string[]',
    'text': 'text',
    'slug': 'slug',
    'int': 'int',
    'int[]': 'int[]',
    'float': 'float',
    'float[]': 'float[]',
    'boolean': 'boolean',
    'boolean[]': 'boolean[]',
    'date': 'date',
    'time': 'time',
    'datetime': 'datetime',
    'json': 'json',
    'image': 'image',
    'image[]': 'image[]',
    'video': 'video',
    'video[]': 'video[]',
    'reference': 'reference',
    'reference[]': 'reference[]',
};

/**
 * Reverse map backend field types to our field types
 */
export const reverseFieldTypeMap: Record<string, FieldType> = {
    'string': 'string',
    'string[]': 'string[]',
    'text': 'text',
    'slug': 'slug',
    'id': 'string', // id fields are essentially strings
    'int': 'int',
    'int[]': 'int[]',
    'float': 'float',
    'float[]': 'float[]',
    'boolean': 'boolean',
    'date': 'date',
    'time': 'time',
    'datetime': 'datetime',
    'json': 'json',
    'image': 'image',
    'image[]': 'image[]',
    'video': 'video',
    'video[]': 'video[]',
    'reference': 'reference',
    'reference[]': 'reference[]',
};

/**
 * Map control types (optional, defaults to 'default')
 */
export const controlTypeMap: Record<string, string> = {
    'string': 'text',
    'text': 'textarea',
    'int': 'default',
    'float': 'default',
    'boolean': 'checkbox',
    'date': 'default',
    'datetime': 'default',
    'time': 'default',
    'image': 'default',
    'video': 'default',
    'reference': 'default',
    'reference[]': 'default',
};

/**
 * Build a create field request from a field definition
 */
export function buildCreateFieldRequest(
    modelId: string,
    fieldName: string,
    fieldDef: FieldDefinition
): CreateFieldRequest {
    const backendType = fieldTypeMap[fieldDef.type as FieldType] || 'string';
    const control = controlTypeMap[backendType] || 'default';

    // Build meta object. Start with any provided meta in settings, then attach reference_types
    const meta: Record<string, any> = { ...(fieldDef.settings?.meta || {}) };
    if (fieldDef.references && Array.isArray(fieldDef.references)) {
        // The sync layer is responsible for resolving reference targets to content-type IDs (UUIDs).
        // Here we place the provided identifiers directly into meta.reference_types so the backend
        // receives an array of content-type IDs as expected.
        meta.reference_types = fieldDef.references.map(ref => {
            if (typeof ref === 'string') return ref;
            // If a branded content type object is provided, prefer any explicit id property
            // (upstream code should already have resolved to IDs, but handle defensively).
            return (ref as any).__definition?.id || (ref as any).__definition?.name || ref;
        });
    }

    return {
        op_type: 'create_field',
        content_type_id: modelId,
        name: fieldName,
        type: backendType,
        control,
        required: fieldDef.required ?? false,
        description: fieldDef.settings?.description,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
    };
}

/**
 * Build an update field request from differences
 */
export function buildUpdateFieldRequest(
    fieldId: string,
    changes: Record<string, any>
): UpdateFieldRequest {
    const request: UpdateFieldRequest = {
        op_type: 'update_field',
        field_id: fieldId,
    };

    if (changes.required !== undefined) {
        request.required = changes.required;
    }
    if (changes.name !== undefined) {
        request.name = changes.name;
    }
    if (changes.description !== undefined) {
        request.description = changes.description;
    }
    // Support updating reference types via changes.references or changes.meta
    if (changes.references !== undefined) {
        request.meta = { ...(changes.meta || {}), reference_types: changes.references };
    } else if (changes.meta !== undefined) {
        request.meta = changes.meta;
    }

    return request;
}

/**
 * Build a create content type request from a content type definition
 */
export function buildCreateContentTypeRequest(ct: ContentTypeDefinition): CreateContentTypeRequest {
    return {
        op_type: 'create_content_type',
        name: ct.displayName || ct.name,
        description: ct.description,
    };
}
