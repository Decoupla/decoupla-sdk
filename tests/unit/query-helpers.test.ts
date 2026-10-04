import { afterEach, describe, expect, test } from 'bun:test';
import { createClient, defineContentType, EntryNotFoundError, ApiError } from '../../src';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const Author = defineContentType({ name: 'author', fields: { Avatar: { type: 'image' }, FullName: { type: 'string' } } });
const Post = defineContentType({ name: 'post', fields: {
    Title: { type: 'string', required: true }, ViewCount: { type: 'int' },
    HeroImage: { type: 'image' }, Author: { type: 'reference', references: [Author] },
} });
const client = () => createClient({ apiToken: 'test', workspace: 'test' });
const json = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status });
function mock(handler: (body: any) => Response) {
    globalThis.fetch = (async (_url: any, options: any) => {
        const body = JSON.parse(options.body);
        return body.op_type === 'inspect' ? json({ content_types: [] }) : handler(body);
    }) as typeof fetch;
}

const image = { id: 'image', width: 1000, height: 500, format: 'png', output: { url: 'https://example/image', width: 400, height: 200, format: 'webp' } };
const rows = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), title: `Post ${i + 1}`, hero_image: image, author: { id: 'author', full_name: 'Author', avatar: image } }));

describe('sorting', () => {
    test('normalizes multiple fields and preserves their precedence', async () => {
        mock(body => {
            expect(body.sort).toEqual([{ field: 'view_count', direction: 'DESC' }, { field: 'title', direction: 'ASC' }]);
            return json([]);
        });
        await client().getEntries(Post, { sort: [['ViewCount', 'DESC'], ['title', 'ASC']] });
    });
    test('rejects invalid directions and single tuples before sending a read', async () => {
        mock(() => { throw new Error('Unexpected read'); });
        await expect(client().getEntries(Post, { sort: [['Title', 'RANDOM']] as any })).rejects.toThrow();
        await expect(client().getEntries(Post, { sort: ['Title', 'ASC'] as any })).rejects.toThrow();
    });
});

describe('missing entries', () => {
    test('returns null for live and preview, including legacy node responses', async () => {
        for (const data of [{ entry: null }, { node: null }, null]) {
            mock(body => { expect(body.api_type).toBe('preview'); return json(data); });
            expect(await client().getEntry(Post, 'missing', { contentView: 'preview' })).toEqual({ data: null });
        }
        mock(() => json({ entry: null }));
        expect(await client().getEntry(Post, 'missing')).toEqual({ data: null });
    });
    test('strict reads throw a distinct error with entry details', async () => {
        mock(() => json({ entry: null }));
        try {
            await client().getEntryOrThrow(Post, 'missing');
            throw new Error('Expected failure');
        } catch (error) {
            expect(error).toBeInstanceOf(EntryNotFoundError);
            expect((error as EntryNotFoundError).entryId).toBe('missing');
            expect((error as EntryNotFoundError).contentType).toBe('post');
        }
    });
    test('strict reads preserve preloads and do not hide API errors', async () => {
        mock(() => json({ entry: rows[0] }));
        const result = await client().getEntryOrThrow(Post, '1', { preload: ['Author'] });
        expect(result.data.author?.fullName).toBe('Author');
        globalThis.fetch = (async () => new Response(JSON.stringify({ errors: [{ field: 'authorization', message: 'Denied' }] }), { status: 403 })) as typeof fetch;
        await expect(client().getEntryOrThrow(Post, '1')).rejects.toBeInstanceOf(ApiError);
    });
});

describe('pagination', () => {
    test('collects pages and preserves nested options and normalized results', async () => {
        const offsets: number[] = [];
        mock(body => {
            offsets.push(body.offset);
            expect(body.limit).toBe(2);
            expect(body.api_type).toBe('preview');
            expect(body.filters).toEqual({ title: { starts_with: 'Post' } });
            expect(body.preload).toEqual(['author']);
            expect(body.images).toEqual({ hero_image: { width: 400, format: 'webp' }, references: { author: { avatar: { width: 80 } } } });
            expect(body.sort).toEqual([{ field: 'view_count', direction: 'DESC' }, { field: 'id', direction: 'ASC' }]);
            return json(rows.slice(body.offset, body.offset + body.limit));
        });
        const all = await client().getAllEntries(Post, { pageSize: 2, contentView: 'preview',
            filters: { Title: { starts_with: 'Post' } }, preload: ['Author'], sort: [['ViewCount', 'DESC']],
            images: { heroImage: { width: 400, format: 'webp' }, references: { author: { avatar: { width: 80 } } } },
        });
        expect(offsets).toEqual([0, 2, 4]);
        expect(all.data.map(entry => entry.id)).toEqual(['1', '2', '3', '4', '5']);
        expect(all.data[0].author?.fullName).toBe('Author');
        expect(all.data[0].heroImage?.output.width).toBe(400);
    });
    test('iterator is lazy and stops requesting pages when the consumer breaks', async () => {
        const offsets: number[] = [];
        mock(body => { offsets.push(body.offset); return json(rows.slice(body.offset, body.offset + body.limit)); });
        const iterator = client().iterateEntries(Post, { pageSize: 2 });
        expect(offsets).toEqual([]);
        for await (const entry of iterator) { expect(entry.id).toBe('1'); break; }
        expect(offsets).toEqual([0]);
    });
    test('handles empty results, initial offset and exact page boundaries', async () => {
        const offsets: number[] = [];
        mock(body => { offsets.push(body.offset); return json(rows.slice(0, 4).slice(body.offset, body.offset + body.limit)); });
        expect((await client().getAllEntries(Post, { pageSize: 2, offset: 2 })).data.map(entry => entry.id)).toEqual(['3', '4']);
        expect(offsets).toEqual([2, 4]);
        offsets.length = 0;
        expect(await client().getAllEntries(Post, { pageSize: 2, offset: 10 })).toEqual({ data: [] });
        expect(offsets).toEqual([10]);
    });
    test('defaults to 100 entries per page and preserves an explicit ID sort', async () => {
        mock(body => { expect(body.limit).toBe(100); expect(body.sort).toEqual([{ field: 'id', direction: 'DESC' }]); return json([]); });
        await client().getAllEntries(Post, { sort: [['id', 'DESC']] });
    });
    test('invalid pagination settings fail before any network request', async () => {
        globalThis.fetch = (() => { throw new Error('Unexpected network request'); }) as typeof fetch;
        for (const pageSize of [0, -1, 1.5, Infinity, NaN]) {
            await expect(client().getAllEntries(Post, { pageSize })).rejects.toThrow('pageSize');
        }
        await expect(client().getAllEntries(Post, { offset: -1 })).rejects.toThrow('offset');
    });
    test('propagates errors on later pages', async () => {
        mock(body => body.offset === 0 ? json(rows.slice(0, 2)) : new Response(JSON.stringify({ errors: [{ message: 'Unavailable' }] }), { status: 503 }));
        await expect(client().getAllEntries(Post, { pageSize: 2 })).rejects.toThrow('HTTP 503');
    });
});

describe('typed writes retain runtime behavior', () => {
    const WriteType = defineContentType({ name: 'write', fields: {
        Title: { type: 'string', required: true }, Count: { type: 'int', required: true },
        PublishedDate: { type: 'date' }, Enabled: { type: 'boolean' }, Hero: { type: 'image' },
    } });
    test('coerces aliases, numeric strings, Dates and ID objects on create', async () => {
        mock(body => {
            expect(body.field_values).toEqual({ title: 'Post', Count: 3, publishedDate: '2026-10-04', Enabled: true, Hero: { id: 'image' } });
            return json({ entry: { id: 'created' } });
        });
        const result = await client().createEntry(WriteType, { title: 'Post', Count: '3',
            publishedDate: new Date('2026-10-04T12:00:00Z'), Enabled: 'true', Hero: { id: 'image' },
        });
        expect(result.id).toBe('created');
    });
    test('partial updates can clear optional fields', async () => {
        mock(body => {
            expect(body.field_values).toEqual({ hero: null });
            return json({ entry: { id: 'updated' } });
        });
        const result = await client().updateEntry(WriteType, '00000000-0000-4000-8000-000000000001', { hero: null });
        expect(result.id).toBe('updated');
    });
    test('dynamic invalid write values still fail runtime validation', async () => {
        globalThis.fetch = (() => { throw new Error('Unexpected request'); }) as typeof fetch;
        await expect(client().createEntry(WriteType, { Title: 'Post' } as any)).rejects.toThrow('Count');
        await expect(client().updateEntry(WriteType, '00000000-0000-4000-8000-000000000001', { count: 'invalid' } as any)).rejects.toThrow('count');
    });
});
