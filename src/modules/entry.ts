/**
 * Entry Creation and Update Types
 * 
 * Supports creating and updating entries (instances of content types)
 */

export type FieldValue =
    | string
    | number
    | boolean
    | null
    | FieldValue[]
    | Record<string, any>;

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
export function isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

/**
 * Validate field values before sending to API
 */
export function validateFieldValues(
    fieldValues: FieldValues,
    requiredFields?: string[]
): { valid: boolean; error?: string; errors?: EntryError[] } {
    if (!fieldValues || typeof fieldValues !== 'object') {
        return {
            valid: false,
            error: 'Field values must be a non-null object'
        };
    }

    // Check required fields
    if (requiredFields && requiredFields.length > 0) {
        const missing = requiredFields.filter(field => {
            const value = fieldValues[field];
            return value === undefined || value === null || value === '';
        });

        if (missing.length > 0) {
            return {
                valid: false,
                errors: missing.map(field => ({
                    field,
                    message: "can't be blank"
                }))
            };
        }
    }

    return { valid: true };
}

/**
 * Convert field values for API (handle camelCase to snake_case conversion)
 */
export function normalizeFieldValues(fieldValues: FieldValues): FieldValues {
    const normalized: FieldValues = {};

    for (const [key, value] of Object.entries(fieldValues)) {
        // Keep the key as-is; API accepts both camelCase and snake_case
        normalized[key] = value;
    }

    return normalized;
}

/**
 * Format entry metadata for display
 */
export function formatEntryMetadata(entry: EntryMetadata): string {
    return `Entry #${entry.id} (v${entry.last_version}, ${entry.state})`;
}
