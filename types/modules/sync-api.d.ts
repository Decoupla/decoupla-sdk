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
    is_label?: boolean;
    meta?: Record<string, any>;
};
export type UpdateFieldRequest = {
    op_type: 'update_field';
    field_id: string;
    name?: string;
    required?: boolean;
    description?: string;
    is_label?: boolean;
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
export type ModelRequest = CreateContentTypeRequest | CreateFieldRequest | UpdateFieldRequest | DeleteFieldRequest | DeleteModelRequest;
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
export type ModelResponse = CreateContentTypeResponse | CreateFieldResponse | UpdateFieldResponse | DeleteFieldResponse | DeleteModelResponse | ErrorResponse;
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
export declare const fieldTypeMap: Record<FieldType, string>;
/**
 * Reverse map backend field types to our field types
 */
export declare const reverseFieldTypeMap: Record<string, FieldType>;
/**
 * Map control types (optional, defaults to 'default')
 */
export declare const controlTypeMap: Record<string, string>;
/**
 * Build a create field request from a field definition
 */
export declare function buildCreateFieldRequest(modelId: string, fieldName: string, fieldDef: FieldDefinition): CreateFieldRequest;
/**
 * Build an update field request from differences
 */
export declare function buildUpdateFieldRequest(fieldId: string, changes: Record<string, any>): UpdateFieldRequest;
/**
 * Build a create content type request from a content type definition
 */
export declare function buildCreateContentTypeRequest(ct: ContentTypeDefinition): CreateContentTypeRequest;
