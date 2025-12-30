import { describe, expect, test } from 'bun:test';
import { buildCreateFieldRequest, buildUpdateFieldRequest } from '../../src/modules/sync-api';

describe('sync-api is_label handling', () => {
    test('buildCreateFieldRequest includes is_label when isLabel set', () => {
        const fieldDef: any = { type: 'string', required: true, isLabel: true };
        const req = buildCreateFieldRequest('model-uuid', 'Title', fieldDef);
        expect(req).toBeDefined();
        expect(req.is_label).toBe(true);
        expect(req.name).toBe('Title');
        expect(req.content_type_id).toBe('model-uuid');
    });

    test('buildCreateFieldRequest includes options at root when provided on field definition', () => {
        const fieldDef: any = { type: 'string', required: false, options: ['red', 'green', 'blue'] };
        const req = buildCreateFieldRequest('model-uuid', 'Color', fieldDef) as any;
        expect(req).toBeDefined();
        expect(req.options).toEqual(['red', 'green', 'blue']);
    });

    test('buildUpdateFieldRequest includes options at root when changes.options provided', () => {
        const req = buildUpdateFieldRequest('field-uuid', { options: ['small', 'medium', 'large'] }) as any;
        expect(req).toBeDefined();
        expect(req.options).toEqual(['small', 'medium', 'large']);
    });

    test('buildUpdateFieldRequest includes null for options when changes explicitly set null', () => {
        const req = buildUpdateFieldRequest('field-uuid', { options: null }) as any;
        expect(req).toBeDefined();
        expect(req.options).toBeNull();
    });
    test('buildUpdateFieldRequest sets is_label when changes include isLabel', () => {
        const req = buildUpdateFieldRequest('field-uuid', { isLabel: true });
        expect(req).toBeDefined();
        // update request should include is_label boolean when provided
        expect((req as any).is_label).toBe(true);
        expect((req as any).field_id).toBe('field-uuid');
    });
});
