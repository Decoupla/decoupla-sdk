/**
 * Entry Creation and Update Types
 *
 * Supports creating and updating entries (instances of content types)
 */

import { snakeToCamel, camelToSnake } from './schema';
import { warn } from '../utils/logger';
import type { FieldDefinition } from '../types';

export type FieldValue =
    | string
    | number
    | boolean
    | null
    | Date
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

// ---------------------------------------------------------------------------
// Field Validation & Type Coercion
// ---------------------------------------------------------------------------

/**
 * Structured validation error with per-field error details.
 */
export class FieldValidationError extends Error {
    public readonly fieldErrors: EntryError[];

    constructor(fieldErrors: EntryError[]) {
        const msg = fieldErrors
            .map(e => `${e.field}: ${e.message}`)
            .join('; ');
        super(`Field validation failed: ${msg}`);
        this.name = 'FieldValidationError';
        this.fieldErrors = fieldErrors;
    }
}

/**
 * Build a map from all possible key variants (PascalCase, snake_case, camelCase)
 * to the canonical field definition key.
 */
export function buildFieldKeyMap(
    fieldDefs: Record<string, FieldDefinition>
): Map<string, string> {
    const keyMap = new Map<string, string>();
    for (const defKey of Object.keys(fieldDefs)) {
        keyMap.set(defKey, defKey);
        try { keyMap.set(camelToSnake(defKey), defKey); } catch (_) { /* */ }
        try { keyMap.set(snakeToCamel(camelToSnake(defKey)), defKey); } catch (_) { /* */ }
    }
    return keyMap;
}

/**
 * Convert a Date object or ISO string to a date-only string (YYYY-MM-DD).
 * Uses local timezone for Date objects.
 */
export function formatDateOnly(val: unknown): string {
    if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }
    throw new Error(`invalid date value: '${String(val)}'`);
}

/**
 * Coerce a single field value to match the expected field type.
 * Returns the coerced value or throws an Error with a descriptive message.
 */
export function coerceFieldValue(
    value: unknown,
    fdef: FieldDefinition,
    fieldName: string
): unknown {
    const { type } = fdef;

    // Handle array types: strip trailing [] and coerce each element
    if (type.endsWith('[]')) {
        if (!Array.isArray(value)) {
            throw new Error(`expected array for type ${type}, got ${typeof value}`);
        }
        const baseType = type.slice(0, -2) as FieldDefinition['type'];
        const baseDef = { ...fdef, type: baseType };
        return value.map((el, i) => {
            try {
                return coerceFieldValue(el, baseDef, `${fieldName}[${i}]`);
            } catch (e: any) {
                throw new Error(`index ${i}: ${e.message}`);
            }
        });
    }

    switch (type) {
        case 'string':
        case 'text':
        case 'slug': {
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            throw new Error(`expected string, got ${typeof value}`);
        }

        case 'int': {
            if (typeof value === 'number') {
                if (Number.isInteger(value)) return value;
                const truncated = Math.trunc(value);
                warn(`Field '${fieldName}': float ${value} truncated to int ${truncated}`);
                return truncated;
            }
            if (typeof value === 'string') {
                const parsed = Number(value);
                if (isNaN(parsed) || !Number.isFinite(parsed)) {
                    throw new Error(`cannot convert string '${value}' to int`);
                }
                if (!Number.isInteger(parsed)) {
                    throw new Error(`cannot convert string '${value}' to int (value is not an integer)`);
                }
                return parsed;
            }
            throw new Error(`expected int, got ${typeof value}`);
        }

        case 'float': {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const parsed = Number(value);
                if (isNaN(parsed) || !Number.isFinite(parsed)) {
                    throw new Error(`cannot convert string '${value}' to float`);
                }
                return parsed;
            }
            throw new Error(`expected float, got ${typeof value}`);
        }

        case 'boolean': {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
                const lower = value.toLowerCase();
                if (lower === 'true') return true;
                if (lower === 'false') return false;
                throw new Error(`cannot convert string '${value}' to boolean (expected 'true' or 'false')`);
            }
            if (typeof value === 'number') {
                if (value === 0) return false;
                if (value === 1) return true;
                throw new Error(`cannot convert number ${value} to boolean (expected 0 or 1)`);
            }
            throw new Error(`expected boolean, got ${typeof value}`);
        }

        case 'date': {
            return formatDateOnly(value);
        }

        case 'time': {
            if (typeof value === 'string') {
                if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value;
                throw new Error(`invalid time format: '${value}' (expected HH:MM or HH:MM:SS)`);
            }
            if (value instanceof Date) {
                const h = String(value.getHours()).padStart(2, '0');
                const m = String(value.getMinutes()).padStart(2, '0');
                const s = String(value.getSeconds()).padStart(2, '0');
                return `${h}:${m}:${s}`;
            }
            throw new Error(`expected time string or Date, got ${typeof value}`);
        }

        case 'datetime': {
            if (value instanceof Date) return value.toISOString();
            if (typeof value === 'string') {
                const parsed = new Date(value);
                if (isNaN(parsed.getTime())) {
                    throw new Error(`invalid datetime value: '${value}'`);
                }
                return value;
            }
            throw new Error(`expected datetime string or Date, got ${typeof value}`);
        }

        case 'json': {
            return value;
        }

        case 'image':
        case 'video': {
            if (typeof value === 'string') return value;
            if (typeof value === 'object' && value !== null && 'id' in value) return value;
            throw new Error(`expected ${type} (UUID string or object with id), got ${typeof value}`);
        }

        case 'reference': {
            if (typeof value === 'string') {
                if (!isValidUUID(value)) {
                    throw new Error(`expected valid UUID for reference, got '${value}'`);
                }
                return value;
            }
            if (typeof value === 'object' && value !== null && 'id' in value) return value;
            throw new Error(`expected reference (UUID string or object with id), got ${typeof value}`);
        }

        default:
            return value;
    }
}

/**
 * Validate and coerce field values against their field definitions.
 *
 * - `isCreate: true` enforces required field checks
 * - Coerces values to match expected types where safe
 * - Validates options/enum constraints
 * - Collects all errors and throws a single FieldValidationError
 */
export function validateAndCoerceFieldValues(
    fieldValues: FieldValues,
    fieldDefs: Record<string, FieldDefinition>,
    opts?: { isCreate?: boolean }
): FieldValues {
    if (!fieldValues || typeof fieldValues !== 'object') {
        throw new FieldValidationError([{ field: '_', message: 'Field values must be a non-null object' }]);
    }

    const errors: EntryError[] = [];
    const keyMap = buildFieldKeyMap(fieldDefs);

    // Check required fields (create only)
    if (opts?.isCreate) {
        for (const [defKey, fdef] of Object.entries(fieldDefs)) {
            if (!fdef.required) continue;
            // Check all possible key variants the caller might use
            const val = fieldValues[defKey]
                ?? fieldValues[snakeToCamel(camelToSnake(defKey))]
                ?? fieldValues[camelToSnake(defKey)];
            if (val === undefined || val === null || val === '') {
                errors.push({ field: defKey, message: 'is required' });
            }
        }
    }

    // Coerce and validate each provided field
    const result: FieldValues = {};
    for (const [key, value] of Object.entries(fieldValues)) {
        const canonicalKey = keyMap.get(key);

        // Unknown key — pass through for the API to handle
        if (!canonicalKey) {
            result[key] = value;
            continue;
        }

        const fdef = fieldDefs[canonicalKey];
        if (!fdef) {
            result[key] = value;
            continue;
        }

        // Null/undefined — pass through (required check already handled above)
        if (value === null || value === undefined) {
            result[key] = value;
            continue;
        }

        // Options/enum validation (string and string[] fields)
        if (fdef.options && fdef.options.length > 0) {
            const vals = Array.isArray(value) ? value : [value];
            for (let i = 0; i < vals.length; i++) {
                if (typeof vals[i] === 'string' && !fdef.options.includes(vals[i] as string)) {
                    const loc = Array.isArray(value) ? ` at index ${i}` : '';
                    errors.push({
                        field: key,
                        message: `value '${vals[i]}'${loc} is not in allowed options: ${fdef.options.join(', ')}`,
                    });
                }
            }
        }

        // Type coercion
        try {
            result[key] = coerceFieldValue(value, fdef, key) as FieldValue;
        } catch (e: any) {
            errors.push({ field: key, message: e.message });
        }
    }

    if (errors.length > 0) {
        throw new FieldValidationError(errors);
    }

    return result;
}

/** Normalize only entry fields, following requested references without rewriting JSON or image metadata. */
export function normalizeReadEntry(entry: Record<string, any>, preload: any[] = []): Record<string, any> {
    const branches = new Map<string, any[]>();
    for (const item of preload) {
        const [field, inner] = typeof item === 'string' ? [item, []] : item;
        branches.set(camelToSnake(field), inner || []);
    }
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(entry)) {
        const branch = branches.get(key);
        let resolved = value;
        if (branch && value != null) {
            resolved = Array.isArray(value)
                ? value.map(child => child && typeof child === 'object' ? normalizeReadEntry(child, branch) : child)
                : typeof value === 'object' ? normalizeReadEntry(value, branch) : value;
        }
        normalized[snakeToCamel(key)] = resolved;
    }
    return normalized;
}
