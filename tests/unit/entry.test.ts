import { describe, it, expect } from 'bun:test';
import {
    isValidUUID,
    validateFieldValues,
    normalizeFieldValues,
    formatEntryMetadata,
} from '../../src/modules/entry';
import type { EntryMetadata } from '../../src/modules/entry';

describe('isValidUUID', () => {
    it('accepts valid v4 UUIDs', () => {
        expect(isValidUUID('00000000-0000-4000-8000-000000000000')).toBe(true);
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('accepts UUIDs with uppercase hex', () => {
        expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('rejects empty string', () => {
        expect(isValidUUID('')).toBe(false);
    });

    it('rejects strings that are not UUIDs', () => {
        expect(isValidUUID('not-a-uuid')).toBe(false);
        expect(isValidUUID('12345')).toBe(false);
        expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false); // too short
    });

    it('rejects UUIDs with wrong separators', () => {
        expect(isValidUUID('550e8400_e29b_41d4_a716_446655440000')).toBe(false);
    });

    it('rejects UUIDs with invalid hex characters', () => {
        expect(isValidUUID('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
    });
});

describe('validateFieldValues', () => {
    it('accepts valid field values object', () => {
        expect(validateFieldValues({ Name: 'John' })).toEqual({ valid: true });
    });

    it('accepts object with various value types', () => {
        expect(validateFieldValues({
            name: 'John',
            age: 30,
            active: true,
            tags: ['a', 'b'],
            meta: { key: 'value' },
        })).toEqual({ valid: true });
    });

    it('rejects null', () => {
        const result = validateFieldValues(null as any);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('rejects non-object', () => {
        const result = validateFieldValues('string' as any);
        expect(result.valid).toBe(false);
    });

    it('checks required fields - passes when present', () => {
        const result = validateFieldValues(
            { Name: 'John', Email: 'john@example.com' },
            ['Name', 'Email']
        );
        expect(result.valid).toBe(true);
    });

    it('checks required fields - fails when missing', () => {
        const result = validateFieldValues(
            { Name: 'John' },
            ['Name', 'Email']
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBe(1);
        expect(result.errors![0].field).toBe('Email');
    });

    it('treats null values as missing for required fields', () => {
        const result = validateFieldValues(
            { Name: null },
            ['Name']
        );
        expect(result.valid).toBe(false);
    });

    it('treats empty string as missing for required fields', () => {
        const result = validateFieldValues(
            { Name: '' },
            ['Name']
        );
        expect(result.valid).toBe(false);
    });

    it('passes with no required fields specified', () => {
        expect(validateFieldValues({})).toEqual({ valid: true });
        expect(validateFieldValues({}, [])).toEqual({ valid: true });
    });
});

describe('normalizeFieldValues', () => {
    it('returns a new object with the same keys', () => {
        const input = { Name: 'John', Email: 'john@example.com' };
        const result = normalizeFieldValues(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input); // should be a new object
    });

    it('preserves all value types', () => {
        const input = {
            str: 'hello',
            num: 42,
            bool: true,
            nil: null,
            arr: [1, 2, 3],
        };
        expect(normalizeFieldValues(input)).toEqual(input);
    });
});

describe('formatEntryMetadata', () => {
    it('formats entry metadata into a readable string', () => {
        const entry: EntryMetadata = {
            id: 'abc-123',
            model_id: 'model-1',
            state: 'active',
            last_version: 3,
            last_published_version: 2,
            created_at: '2025-01-01',
            updated_at: '2025-01-02',
        };
        const result = formatEntryMetadata(entry);
        expect(result).toContain('abc-123');
        expect(result).toContain('v3');
        expect(result).toContain('active');
    });
});
