import { describe, it, expect } from 'bun:test';
import {
    isValidUUID,
    validateFieldValues,
    normalizeFieldValues,
    formatEntryMetadata,
    buildFieldKeyMap,
    formatDateOnly,
    coerceFieldValue,
    validateAndCoerceFieldValues,
    FieldValidationError,
} from '../../src/modules/entry';
import type { EntryMetadata } from '../../src/modules/entry';
import type { FieldDefinition } from '../../src/types';

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

// ---------------------------------------------------------------------------
// Field Validation & Type Coercion
// ---------------------------------------------------------------------------

const mkDef = (type: FieldDefinition['type'], extra?: Partial<FieldDefinition>): FieldDefinition => ({
    type,
    ...extra,
});

describe('buildFieldKeyMap', () => {
    it('maps PascalCase key to itself', () => {
        const map = buildFieldKeyMap({ Title: mkDef('string') });
        expect(map.get('Title')).toBe('Title');
    });

    it('maps snake_case variant to canonical key', () => {
        const map = buildFieldKeyMap({ ViewCount: mkDef('int') });
        expect(map.get('view_count')).toBe('ViewCount');
    });

    it('maps camelCase variant to canonical key', () => {
        const map = buildFieldKeyMap({ ViewCount: mkDef('int') });
        expect(map.get('viewCount')).toBe('ViewCount');
    });

    it('handles single-word keys', () => {
        const map = buildFieldKeyMap({ Name: mkDef('string') });
        expect(map.get('Name')).toBe('Name');
        expect(map.get('name')).toBe('Name');
    });

    it('returns empty map for empty fieldDefs', () => {
        const map = buildFieldKeyMap({});
        expect(map.size).toBe(0);
    });
});

describe('formatDateOnly', () => {
    it('converts Date object to YYYY-MM-DD', () => {
        const d = new Date(2025, 0, 15); // Jan 15 2025 local
        expect(formatDateOnly(d)).toBe('2025-01-15');
    });

    it('passes through YYYY-MM-DD string as-is', () => {
        expect(formatDateOnly('2025-06-30')).toBe('2025-06-30');
    });

    it('converts ISO datetime string to YYYY-MM-DD', () => {
        const result = formatDateOnly('2025-03-20T14:30:00Z');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('throws on invalid date string', () => {
        expect(() => formatDateOnly('not-a-date')).toThrow('invalid date');
    });

    it('throws on non-date/non-string input', () => {
        expect(() => formatDateOnly(12345)).toThrow('invalid date');
    });
});

describe('coerceFieldValue', () => {
    describe('string type', () => {
        it('passes string through unchanged', () => {
            expect(coerceFieldValue('hello', mkDef('string'), 'f')).toBe('hello');
        });

        it('coerces number to string', () => {
            expect(coerceFieldValue(42, mkDef('string'), 'f')).toBe('42');
        });

        it('coerces boolean to string', () => {
            expect(coerceFieldValue(true, mkDef('string'), 'f')).toBe('true');
        });

        it('throws on object', () => {
            expect(() => coerceFieldValue({}, mkDef('string'), 'f')).toThrow('expected string');
        });
    });

    describe('text type', () => {
        it('passes string through', () => {
            expect(coerceFieldValue('long text', mkDef('text'), 'f')).toBe('long text');
        });

        it('coerces number to string', () => {
            expect(coerceFieldValue(100, mkDef('text'), 'f')).toBe('100');
        });
    });

    describe('int type', () => {
        it('passes integer through unchanged', () => {
            expect(coerceFieldValue(42, mkDef('int'), 'f')).toBe(42);
        });

        it('truncates float to int', () => {
            expect(coerceFieldValue(3.7, mkDef('int'), 'f')).toBe(3);
        });

        it('coerces string "42" to number 42', () => {
            expect(coerceFieldValue('42', mkDef('int'), 'f')).toBe(42);
        });

        it('throws on string "abc"', () => {
            expect(() => coerceFieldValue('abc', mkDef('int'), 'f')).toThrow("cannot convert string 'abc' to int");
        });

        it('throws on string "3.14" (not an integer)', () => {
            expect(() => coerceFieldValue('3.14', mkDef('int'), 'f')).toThrow('not an integer');
        });

        it('throws on boolean', () => {
            expect(() => coerceFieldValue(true, mkDef('int'), 'f')).toThrow('expected int');
        });
    });

    describe('float type', () => {
        it('passes number through unchanged', () => {
            expect(coerceFieldValue(3.14, mkDef('float'), 'f')).toBe(3.14);
        });

        it('coerces string "3.14" to number', () => {
            expect(coerceFieldValue('3.14', mkDef('float'), 'f')).toBe(3.14);
        });

        it('throws on string "abc"', () => {
            expect(() => coerceFieldValue('abc', mkDef('float'), 'f')).toThrow("cannot convert string 'abc' to float");
        });
    });

    describe('boolean type', () => {
        it('passes boolean through unchanged', () => {
            expect(coerceFieldValue(true, mkDef('boolean'), 'f')).toBe(true);
            expect(coerceFieldValue(false, mkDef('boolean'), 'f')).toBe(false);
        });

        it('coerces "true" to true', () => {
            expect(coerceFieldValue('true', mkDef('boolean'), 'f')).toBe(true);
        });

        it('coerces "false" to false', () => {
            expect(coerceFieldValue('false', mkDef('boolean'), 'f')).toBe(false);
        });

        it('coerces case-insensitively', () => {
            expect(coerceFieldValue('TRUE', mkDef('boolean'), 'f')).toBe(true);
            expect(coerceFieldValue('False', mkDef('boolean'), 'f')).toBe(false);
        });

        it('coerces 0 to false', () => {
            expect(coerceFieldValue(0, mkDef('boolean'), 'f')).toBe(false);
        });

        it('coerces 1 to true', () => {
            expect(coerceFieldValue(1, mkDef('boolean'), 'f')).toBe(true);
        });

        it('throws on number 2', () => {
            expect(() => coerceFieldValue(2, mkDef('boolean'), 'f')).toThrow('cannot convert number 2 to boolean');
        });

        it('throws on string "yes"', () => {
            expect(() => coerceFieldValue('yes', mkDef('boolean'), 'f')).toThrow("cannot convert string 'yes' to boolean");
        });
    });

    describe('date type', () => {
        it('passes YYYY-MM-DD string through', () => {
            expect(coerceFieldValue('2025-01-15', mkDef('date'), 'f')).toBe('2025-01-15');
        });

        it('converts Date object to YYYY-MM-DD', () => {
            const d = new Date(2025, 5, 15);
            expect(coerceFieldValue(d, mkDef('date'), 'f')).toBe('2025-06-15');
        });

        it('throws on invalid string', () => {
            expect(() => coerceFieldValue('not-a-date', mkDef('date'), 'f')).toThrow('invalid date');
        });
    });

    describe('time type', () => {
        it('passes HH:MM:SS string through', () => {
            expect(coerceFieldValue('14:30:00', mkDef('time'), 'f')).toBe('14:30:00');
        });

        it('passes HH:MM string through', () => {
            expect(coerceFieldValue('14:30', mkDef('time'), 'f')).toBe('14:30');
        });

        it('converts Date object to HH:MM:SS', () => {
            const d = new Date(2025, 0, 1, 14, 30, 45);
            expect(coerceFieldValue(d, mkDef('time'), 'f')).toBe('14:30:45');
        });

        it('throws on invalid format', () => {
            expect(() => coerceFieldValue('not-time', mkDef('time'), 'f')).toThrow('invalid time format');
        });
    });

    describe('datetime type', () => {
        it('passes ISO string through', () => {
            const iso = '2025-01-15T14:30:00Z';
            expect(coerceFieldValue(iso, mkDef('datetime'), 'f')).toBe(iso);
        });

        it('converts Date object to ISO string', () => {
            const d = new Date('2025-01-15T14:30:00Z');
            expect(coerceFieldValue(d, mkDef('datetime'), 'f')).toBe(d.toISOString());
        });

        it('throws on invalid date string', () => {
            expect(() => coerceFieldValue('not-a-date', mkDef('datetime'), 'f')).toThrow('invalid datetime');
        });
    });

    describe('json type', () => {
        it('passes any value through', () => {
            expect(coerceFieldValue('str', mkDef('json'), 'f')).toBe('str');
            expect(coerceFieldValue(42, mkDef('json'), 'f')).toBe(42);
            expect(coerceFieldValue({ a: 1 }, mkDef('json'), 'f')).toEqual({ a: 1 });
            expect(coerceFieldValue(null, mkDef('json'), 'f')).toBe(null);
        });
    });

    describe('image type', () => {
        it('passes UUID string through', () => {
            expect(coerceFieldValue('abc-123', mkDef('image'), 'f')).toBe('abc-123');
        });

        it('passes object with id through', () => {
            const obj = { id: 'abc', url: 'http://...' };
            expect(coerceFieldValue(obj, mkDef('image'), 'f')).toEqual(obj);
        });

        it('throws on number', () => {
            expect(() => coerceFieldValue(42, mkDef('image'), 'f')).toThrow('expected image');
        });
    });

    describe('reference type', () => {
        it('passes valid UUID string through', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            expect(coerceFieldValue(uuid, mkDef('reference'), 'f')).toBe(uuid);
        });

        it('throws on invalid UUID string', () => {
            expect(() => coerceFieldValue('not-a-uuid', mkDef('reference'), 'f')).toThrow('expected valid UUID');
        });

        it('passes object with id through', () => {
            const obj = { id: '550e8400-e29b-41d4-a716-446655440000' };
            expect(coerceFieldValue(obj, mkDef('reference'), 'f')).toEqual(obj);
        });
    });

    describe('array types', () => {
        it('coerces each element of string[]', () => {
            expect(coerceFieldValue(['a', 42, true], mkDef('string[]'), 'f')).toEqual(['a', '42', 'true']);
        });

        it('coerces each element of int[]', () => {
            expect(coerceFieldValue([1, '2', 3], mkDef('int[]'), 'f')).toEqual([1, 2, 3]);
        });

        it('throws if value is not an array', () => {
            expect(() => coerceFieldValue('not-array', mkDef('string[]'), 'f')).toThrow('expected array');
        });

        it('reports index in error message for element failures', () => {
            expect(() => coerceFieldValue([1, 'abc', 3], mkDef('int[]'), 'f')).toThrow('index 1');
        });
    });
});

describe('validateAndCoerceFieldValues', () => {
    const fieldDefs: Record<string, FieldDefinition> = {
        Title: { type: 'string', required: true },
        ViewCount: { type: 'int' },
        IsPublished: { type: 'boolean' },
        PublishedDate: { type: 'date' },
        Status: { type: 'string', options: ['draft', 'published', 'archived'] },
        Author: { type: 'reference' },
    };

    describe('required field validation (isCreate: true)', () => {
        it('throws when required field is missing', () => {
            expect(() => validateAndCoerceFieldValues({}, fieldDefs, { isCreate: true }))
                .toThrow(FieldValidationError);
        });

        it('throws when required field is null', () => {
            expect(() => validateAndCoerceFieldValues({ Title: null }, fieldDefs, { isCreate: true }))
                .toThrow('is required');
        });

        it('throws when required field is empty string', () => {
            expect(() => validateAndCoerceFieldValues({ Title: '' }, fieldDefs, { isCreate: true }))
                .toThrow('is required');
        });

        it('passes when all required fields are present', () => {
            const result = validateAndCoerceFieldValues({ Title: 'Hello' }, fieldDefs, { isCreate: true });
            expect(result.Title).toBe('Hello');
        });

        it('exposes fieldErrors on the error', () => {
            try {
                validateAndCoerceFieldValues({}, fieldDefs, { isCreate: true });
                expect(true).toBe(false); // should not reach
            } catch (e) {
                expect(e).toBeInstanceOf(FieldValidationError);
                expect((e as FieldValidationError).fieldErrors).toEqual([
                    { field: 'Title', message: 'is required' },
                ]);
            }
        });
    });

    describe('required field validation skipped (isCreate: false)', () => {
        it('does not throw when required fields are missing in update mode', () => {
            const result = validateAndCoerceFieldValues({ ViewCount: 10 }, fieldDefs, { isCreate: false });
            expect(result.ViewCount).toBe(10);
        });
    });

    describe('options validation', () => {
        it('passes when string value is in options', () => {
            const result = validateAndCoerceFieldValues(
                { Title: 'Hi', Status: 'draft' }, fieldDefs, { isCreate: true }
            );
            expect(result.Status).toBe('draft');
        });

        it('throws when string value is not in options', () => {
            expect(() => validateAndCoerceFieldValues(
                { Title: 'Hi', Status: 'invalid' }, fieldDefs, { isCreate: true }
            )).toThrow("not in allowed options");
        });
    });

    describe('key mapping', () => {
        it('maps camelCase input keys to PascalCase field definitions', () => {
            const result = validateAndCoerceFieldValues(
                { Title: 'Hi', viewCount: '10' }, fieldDefs, { isCreate: true }
            );
            expect(result.viewCount).toBe(10); // coerced from string
        });

        it('passes through unknown keys unchanged', () => {
            const result = validateAndCoerceFieldValues(
                { Title: 'Hi', UnknownField: 'value' }, fieldDefs, { isCreate: true }
            );
            expect(result.UnknownField).toBe('value');
        });
    });

    describe('coercion integration', () => {
        it('coerces date fields to YYYY-MM-DD', () => {
            const d = new Date(2025, 5, 15);
            const result = validateAndCoerceFieldValues(
                { Title: 'Hi', PublishedDate: d }, fieldDefs, { isCreate: true }
            );
            expect(result.PublishedDate).toBe('2025-06-15');
        });

        it('coerces int fields from string', () => {
            const result = validateAndCoerceFieldValues(
                { Title: 'Hi', ViewCount: '42' }, fieldDefs, { isCreate: true }
            );
            expect(result.ViewCount).toBe(42);
        });

        it('returns new object (does not mutate input)', () => {
            const input = { Title: 'Hi', ViewCount: '10' };
            const result = validateAndCoerceFieldValues(input, fieldDefs, { isCreate: true });
            expect(result).not.toBe(input);
            expect(input.ViewCount).toBe('10'); // unchanged
        });

        it('passes through null values on optional fields', () => {
            const result = validateAndCoerceFieldValues(
                { Title: 'Hi', ViewCount: null }, fieldDefs, { isCreate: true }
            );
            expect(result.ViewCount).toBe(null);
        });

        it('collects multiple errors into single FieldValidationError', () => {
            try {
                validateAndCoerceFieldValues(
                    { ViewCount: 'abc', IsPublished: 'maybe' },
                    fieldDefs,
                    { isCreate: true }
                );
                expect(true).toBe(false);
            } catch (e) {
                expect(e).toBeInstanceOf(FieldValidationError);
                const errors = (e as FieldValidationError).fieldErrors;
                // At least: Title required, ViewCount conversion fail, IsPublished conversion fail
                expect(errors.length).toBeGreaterThanOrEqual(3);
            }
        });
    });
});
