import { describe, it, expect } from 'bun:test';
import { buildFilters } from '../../src/modules/filters';
import { defineContentType } from '../../src';

const TestContentType = defineContentType({
    name: 'test_item',
    fields: {
        Title: { type: 'string' as const, required: true },
        Count: { type: 'int' as const, required: false },
        IsActive: { type: 'boolean' as const, required: false },
        PublishedDate: { type: 'date' as const, required: false },
        Price: { type: 'float' as const, required: false },
        Tags: { type: 'string[]' as const, required: false },
    },
});

describe('buildFilters', () => {
    it('converts PascalCase field names to snake_case', () => {
        const result = buildFilters(TestContentType, {
            Title: { eq: 'Hello' },
        });
        expect(result).toEqual({ title: { eq: 'Hello' } });
    });

    it('converts multi-word PascalCase field names', () => {
        const result = buildFilters(TestContentType, {
            IsActive: { eq: true },
        });
        expect(result).toEqual({ is_active: { eq: true } });
    });

    it('converts camelCase field names', () => {
        const result = buildFilters(TestContentType, {
            PublishedDate: { gte: '2025-01-01' },
        });
        expect(result).toEqual({ published_date: { gte: '2025-01-01' } });
    });

    it('preserves and/or operators without converting', () => {
        const result = buildFilters(TestContentType, {
            and: [
                { Title: { eq: 'Hello' } },
                { IsActive: { eq: true } },
            ],
        });
        expect(result).toEqual({
            and: [
                { title: { eq: 'Hello' } },
                { is_active: { eq: true } },
            ],
        });
    });

    it('handles nested and/or combinations', () => {
        const result = buildFilters(TestContentType, {
            or: [
                {
                    and: [
                        { Title: { contains: 'TypeScript' } },
                        { IsActive: { eq: true } },
                    ],
                },
                { Count: { gte: 100 } },
            ],
        });
        expect(result).toEqual({
            or: [
                {
                    and: [
                        { title: { contains: 'TypeScript' } },
                        { is_active: { eq: true } },
                    ],
                },
                { count: { gte: 100 } },
            ],
        });
    });

    it('handles multiple filters on different fields', () => {
        const result = buildFilters(TestContentType, {
            Title: { contains: 'test' },
            Count: { gte: 5 },
        });
        expect(result).toEqual({
            title: { contains: 'test' },
            count: { gte: 5 },
        });
    });

    it('handles empty filter object', () => {
        const result = buildFilters(TestContentType, {});
        expect(result).toEqual({});
    });

    it('handles list operations (any/none/every)', () => {
        const result = buildFilters(TestContentType, {
            Tags: { any: { eq: 'featured' } },
        } as any);
        expect(result).toEqual({
            tags: { any: { eq: 'featured' } },
        });
    });

    it('preserves primitive filter values', () => {
        const result = buildFilters(TestContentType, {
            Title: { eq: 'exact match' },
            Count: { gte: 42 },
            IsActive: { eq: false },
        });
        expect(result.title).toEqual({ eq: 'exact match' });
        expect(result.count).toEqual({ gte: 42 });
        expect(result.is_active).toEqual({ eq: false });
    });
});
