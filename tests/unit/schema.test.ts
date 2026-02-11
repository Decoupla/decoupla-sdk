import { describe, it, expect } from 'bun:test';
import { snakeToCamel, camelToSnake, initSchema, requestSchema } from '../../src/modules/schema';

describe('snakeToCamel', () => {
    it('converts simple snake_case', () => {
        expect(snakeToCamel('hello_world')).toBe('helloWorld');
    });

    it('converts multiple underscores', () => {
        expect(snakeToCamel('one_two_three')).toBe('oneTwoThree');
    });

    it('leaves already camelCase unchanged', () => {
        expect(snakeToCamel('helloWorld')).toBe('helloWorld');
    });

    it('handles single word', () => {
        expect(snakeToCamel('hello')).toBe('hello');
    });

    it('handles empty string', () => {
        expect(snakeToCamel('')).toBe('');
    });

    it('converts model_id correctly', () => {
        expect(snakeToCamel('model_id')).toBe('modelId');
    });

    it('converts last_published_version correctly', () => {
        expect(snakeToCamel('last_published_version')).toBe('lastPublishedVersion');
    });

    it('converts is_label correctly', () => {
        expect(snakeToCamel('is_label')).toBe('isLabel');
    });
});

describe('camelToSnake', () => {
    it('converts simple camelCase', () => {
        expect(camelToSnake('helloWorld')).toBe('hello_world');
    });

    it('converts PascalCase', () => {
        expect(camelToSnake('HelloWorld')).toBe('hello_world');
    });

    it('converts multiple uppercase letters', () => {
        expect(camelToSnake('oneTwoThree')).toBe('one_two_three');
    });

    it('handles single word lowercase', () => {
        expect(camelToSnake('hello')).toBe('hello');
    });

    it('handles single word PascalCase', () => {
        expect(camelToSnake('Title')).toBe('title');
    });

    it('handles empty string', () => {
        expect(camelToSnake('')).toBe('');
    });

    it('converts IsPublished correctly', () => {
        expect(camelToSnake('IsPublished')).toBe('is_published');
    });

    it('converts ViewCount correctly', () => {
        expect(camelToSnake('ViewCount')).toBe('view_count');
    });

    it('converts PublishedDate correctly', () => {
        expect(camelToSnake('PublishedDate')).toBe('published_date');
    });

    it('converts modelId correctly', () => {
        expect(camelToSnake('modelId')).toBe('model_id');
    });
});

describe('initSchema (Zod)', () => {
    it('accepts valid config', () => {
        const result = initSchema.safeParse({
            apiToken: 'tok_123',
            workspace: 'ws-abc',
        });
        expect(result.success).toBe(true);
    });

    it('rejects missing apiToken', () => {
        const result = initSchema.safeParse({
            workspace: 'ws-abc',
        });
        expect(result.success).toBe(false);
    });

    it('rejects missing workspace', () => {
        const result = initSchema.safeParse({
            apiToken: 'tok_123',
        });
        expect(result.success).toBe(false);
    });

    it('rejects empty apiToken', () => {
        const result = initSchema.safeParse({
            apiToken: '',
            workspace: 'ws-abc',
        });
        expect(result.success).toBe(false);
    });

    it('rejects empty workspace', () => {
        const result = initSchema.safeParse({
            apiToken: 'tok_123',
            workspace: '',
        });
        expect(result.success).toBe(false);
    });
});

describe('requestSchema (Zod)', () => {
    it('accepts a valid get_entry request', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entry',
            entry_id: 'abc-123',
        });
        expect(result.success).toBe(true);
    });

    it('accepts a valid get_entries request', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entries',
            filters: { Title: { eq: 'test' } },
            limit: 10,
            offset: 0,
        });
        expect(result.success).toBe(true);
    });

    it('accepts a valid inspect request', () => {
        const result = requestSchema.safeParse({
            op_type: 'inspect',
        });
        expect(result.success).toBe(true);
    });

    it('rejects invalid op_type', () => {
        const result = requestSchema.safeParse({
            op_type: 'delete_everything',
        });
        expect(result.success).toBe(false);
    });

    it('accepts sort parameter', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entries',
            sort: [['title', 'ASC'], ['created_at', 'DESC']],
        });
        expect(result.success).toBe(true);
    });

    it('rejects invalid sort direction', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entries',
            sort: [['title', 'RANDOM']],
        });
        expect(result.success).toBe(false);
    });

    it('rejects negative limit', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entries',
            limit: -1,
        });
        expect(result.success).toBe(false);
    });

    it('rejects zero limit', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entries',
            limit: 0,
        });
        expect(result.success).toBe(false);
    });

    it('rejects negative offset', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entries',
            offset: -1,
        });
        expect(result.success).toBe(false);
    });

    it('accepts api_type live and preview', () => {
        expect(requestSchema.safeParse({ op_type: 'get_entries', api_type: 'live' }).success).toBe(true);
        expect(requestSchema.safeParse({ op_type: 'get_entries', api_type: 'preview' }).success).toBe(true);
    });

    it('rejects invalid api_type', () => {
        expect(requestSchema.safeParse({ op_type: 'get_entries', api_type: 'draft' }).success).toBe(false);
    });

    it('accepts preload parameter', () => {
        const result = requestSchema.safeParse({
            op_type: 'get_entries',
            preload: ['Author', ['Comments', ['User']]],
        });
        expect(result.success).toBe(true);
    });
});
