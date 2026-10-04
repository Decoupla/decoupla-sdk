/**
 * Entry Creation and Update Types
 *
 * Supports creating and updating entries (instances of content types)
 */
import type { FieldDefinition } from '../types';
export type FieldValue = string | number | boolean | null | Date | FieldValue[] | Record<string, any>;
export type FieldValues = Record<string, FieldValue>;
export type CreateEntryRequest = {
    op_type: 'create_entry';
    field_values: FieldValues;
    published?: boolean;
};
export type UpdateEntryRequest = {
    op_type: 'update_entry';
    entry_id: string;
    field_values: FieldValues;
    published?: boolean;
};
export type EntryMetadata = {
    id: string;
    model_id: string;
    state: string;
    last_version: number;
    last_published_version: number | null;
    created_at: string;
    updated_at: string;
};
/**
 * Normalized version of EntryMetadata with camelCase field names
 */
export type NormalizedEntryMetadata = {
    id: string;
    modelId: string;
    state: string;
    lastVersion: number;
    lastPublishedVersion: number | null;
    createdAt: string;
    updatedAt: string;
};
export type CreateEntryResponse = {
    data: {
        entry: EntryMetadata;
    };
};
export type UpdateEntryResponse = CreateEntryResponse;
export type EntryError = {
    field: string;
    message: string;
};
export type EntryErrorResponse = {
    errors: EntryError[];
};
/**
 * Validate entry ID (must be valid UUID)
 */
export declare function isValidUUID(id: string): boolean;
/**
 * Validate field values before sending to API
 */
export declare function validateFieldValues(fieldValues: FieldValues, requiredFields?: string[]): {
    valid: boolean;
    error?: string;
    errors?: EntryError[];
};
/**
 * Convert field values for API (handle camelCase to snake_case conversion)
 */
export declare function normalizeFieldValues(fieldValues: FieldValues): FieldValues;
/**
 * Format entry metadata for display
 */
export declare function formatEntryMetadata(entry: EntryMetadata): string;
/**
 * Structured validation error with per-field error details.
 */
export declare class FieldValidationError extends Error {
    readonly fieldErrors: EntryError[];
    constructor(fieldErrors: EntryError[]);
}
/**
 * Build a map from all possible key variants (PascalCase, snake_case, camelCase)
 * to the canonical field definition key.
 */
export declare function buildFieldKeyMap(fieldDefs: Record<string, FieldDefinition>): Map<string, string>;
/**
 * Convert a Date object or ISO string to a date-only string (YYYY-MM-DD).
 * Uses local timezone for Date objects.
 */
export declare function formatDateOnly(val: unknown): string;
/**
 * Coerce a single field value to match the expected field type.
 * Returns the coerced value or throws an Error with a descriptive message.
 */
export declare function coerceFieldValue(value: unknown, fdef: FieldDefinition, fieldName: string): unknown;
/**
 * Validate and coerce field values against their field definitions.
 *
 * - `isCreate: true` enforces required field checks
 * - Coerces values to match expected types where safe
 * - Validates options/enum constraints
 * - Collects all errors and throws a single FieldValidationError
 */
export declare function validateAndCoerceFieldValues(fieldValues: FieldValues, fieldDefs: Record<string, FieldDefinition>, opts?: {
    isCreate?: boolean;
}): FieldValues;
/** Normalize only entry fields, following requested references without rewriting JSON or image metadata. */
export declare function normalizeReadEntry(entry: Record<string, any>, preload?: any[]): Record<string, any>;
