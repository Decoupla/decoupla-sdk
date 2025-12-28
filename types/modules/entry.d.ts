/**
 * Entry Creation and Update Types
 *
 * Supports creating and updating entries (instances of content types)
 */
export type FieldValue = string | number | boolean | null | FieldValue[] | Record<string, any>;
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
