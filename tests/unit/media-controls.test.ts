import { afterEach, describe, expect, test } from 'bun:test';
import { createClient, defineContentType, ApiError } from '../../src';
import { apiFetch } from '../../src/modules/transport';
const saved = globalThis.fetch;
afterEach(() => { globalThis.fetch = saved; });
const Author = defineContentType({ name: 'author', fields: { IntroVideo: { type: 'video' } } });
const Post = defineContentType({ name: 'post', fields: { Title: { type: 'string' }, HeroVideo: { type: 'video' }, Clips: { type: 'video[]' }, Author: { type: 'reference', references: [Author] } } });
const json = (data: any) => new Response(JSON.stringify({ data }));
const config = { apiToken: 'test', workspace: 'a/b', apiUrl: 'https://api.example/custom/' };
const metadata = { id: 'entry', model_id: 'model', state: 'active', last_version: 1, last_published_version: 1 };

describe('request controls', () => {
    test('custom fetch and API URL are used for reads, writes, upload, sync and delete', async () => {
        const calls: any[] = [];
        const customFetch = (async (url: any, options: any) => {
            if (options.method === 'PUT') {
                expect(url).toBe('https://storage.example/upload');
                expect(options.headers.Authorization).toBeUndefined();
                return new Response(null, { status: 200 });
            }
            expect(url).toBe('https://api.example/custom/a%2Fb');
            expect(options.headers.Authorization).toBe('Bearer test');
            const body = options.body instanceof FormData ? { op_type: options.body.get('op_type') } : JSON.parse(options.body);
            calls.push(body);
            if (body.op_type === 'inspect') return json({ content_types: [] });
            if (body.op_type === 'get_entry') return json({ entry: metadata });
            if (body.op_type === 'get_entries') return json([]);
            if (body.op_type === 'upload_file') return json({ file: { id: 'file', type: 'video' } });
            if (body.op_type === 'prepare_upload') return json({ upload: { upload_id: 'upload', url: 'https://storage.example/upload', content_type: 'video/mp4' } });
            if (body.op_type === 'complete_upload') return json({ file: { id: 'file', type: 'video' } });
            if (body.op_type === 'create_content_type') return json({ content_type: { id: 'type', slug: 'post', fields: [] } });
            return json({ entry: metadata });
        }) as typeof fetch;
        globalThis.fetch = (() => { throw new Error('Global fetch must not be used'); }) as typeof fetch;
        const client = createClient({ ...config, fetch: customFetch });
        await client.inspect(); await client.getEntry(Post, 'entry'); await client.getEntries(Post);
        await client.createEntry(Post, { Title: 'Post' });
        await client.updateEntry(Post, '00000000-0000-4000-8000-000000000001', { Title: 'Post' });
        await client.upload(new File(['video'], 'video.mp4'));
        await client.deleteContentType('00000000-0000-4000-8000-000000000001');
        await client.syncWithFields([defineContentType({ name: 'empty', fields: {} })], { dryRun: false });
        expect(calls.some(body => body.op_type === 'create_content_type')).toBe(true);
    });
    test('per-client endpoints and fetch providers remain independent', async () => {
        const a = createClient({ ...config, fetch: (async url => { expect(String(url)).toStartWith(config.apiUrl); return json({ content_types: [] }); }) as typeof fetch });
        const b = createClient({ ...config, apiUrl: 'https://other.example', fetch: (async url => { expect(url).toBe('https://other.example/a%2Fb'); return json({ content_types: [] }); }) as typeof fetch });
        await Promise.all([a.inspect(), b.inspect()]);
    });
    test('already aborted reads do not invoke fetch', async () => {
        const controller = new AbortController(); controller.abort();
        const client = createClient({ ...config, fetch: (() => { throw new Error('Must not fetch'); }) as typeof fetch });
        await expect(client.getEntry(Post, 'entry', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    });
    test('caller cancellation stops an in-flight request even if custom fetch ignores abort', async () => {
        const controller = new AbortController();
        let started!: () => void;
        const start = new Promise<void>(resolve => { started = resolve; });
        const client = createClient({ ...config, fetch: (() => { started(); return new Promise(() => {}); }) as typeof fetch });
        const pending = client.getEntries(Post, { signal: controller.signal });
        const handled = pending.catch(error => error);
        await start; controller.abort(); expect(await handled).toMatchObject({ name: 'AbortError' });
    });
    test('cancellation and timeouts cover response-body parsing', async () => {
        const hangingBody = (async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) })) as any;
        const controller = new AbortController();
        const pending = apiFetch('https://example', { signal: controller.signal }, 1000, hangingBody);
        const handled = pending.catch(error => error);
        controller.abort(); expect(await handled).toMatchObject({ name: 'AbortError' });
        await expect(apiFetch('https://example', {}, 5, hangingBody)).rejects.toThrow('timed out after 5ms');
    });
    test('per-call timeouts override the client default without becoming AbortError', async () => {
        const client = createClient({ ...config, requestTimeoutMs: 1000, fetch: (() => new Promise(() => {})) as typeof fetch });
        const error = await client.getEntry(Post, 'entry', { requestTimeoutMs: 5 }).catch(error => error);
        expect(error).toBeInstanceOf(ApiError); expect(error.message).toContain('after 5ms');
    });
    test('cancellation stops yielding entries already buffered by pagination', async () => {
        const controller = new AbortController();
        const client = createClient({ ...config, fetch: (async () => json([metadata, { ...metadata, id: 'second' }])) as typeof fetch });
        const entries = client.iterateEntries(Post, { signal: controller.signal, pageSize: 2 });
        expect((await entries.next()).value?.id).toBe('entry');
        controller.abort();
        await expect(entries.next()).rejects.toMatchObject({ name: 'AbortError' });
    });
    test('signals apply to writes, uploads, deletes and pagination', async () => {
        const controller = new AbortController(); controller.abort();
        const client = createClient({ ...config, fetch: (() => { throw new Error('Must not fetch'); }) as typeof fetch });
        for (const request of [
            client.createEntry(Post, {}, { signal: controller.signal }),
            client.updateEntry(Post, '00000000-0000-4000-8000-000000000001', {}, { signal: controller.signal }),
            client.upload(new File(['video'], 'video.mp4'), undefined, { signal: controller.signal }),
            client.deleteContentType('00000000-0000-4000-8000-000000000001', { signal: controller.signal }),
            client.getAllEntries(Post, { signal: controller.signal }),
        ].map(promise => promise.catch(error => error))) expect(await request).toMatchObject({ name: 'AbortError' });
    });
});

describe('bulk updates', () => {
    test('normalizes filters, values, sort and preload, and preserves partial failures', async () => {
        const client = createClient({ ...config, fetch: (async (_url: any, options: any) => {
            const body = JSON.parse(options.body);
            if (body.op_type === 'inspect') return json({ content_types: [] });
            expect(body).toMatchObject({ op_type: 'update_entry', type: 'post', filters: { title: { eq: 'Old' } }, field_values: { Title: 'New' }, published: false, api_type: 'preview', limit: 10, offset: 2, sort: [{ field: 'title', direction: 'ASC' }], preload: ['author'] });
            return json({ entries: [{ ...metadata, author: { id: 'author', intro_video: null } }], updated_count: 1, failed_count: 1, errors: [[{ field: 'title', message: 'Required' }]] });
        }) as typeof fetch });
        const result = await client.updateEntries(Post, { filters: { Title: { eq: 'Old' } }, values: { Title: 'New' }, published: false, contentView: 'preview', limit: 10, offset: 2, sort: [['Title', 'ASC']], preload: ['Author'] });
        expect(result.updatedCount).toBe(1); expect(result.failedCount).toBe(1);
        expect(result.errors).toEqual([[{ field: 'title', message: 'Required' }]]);
        expect(result.data[0]?.author?.introVideo).toBeNull();
    });
    test('requires explicit filters and validates malformed success responses', async () => {
        const client = createClient({ ...config, fetch: (async (_url: any, request: any) => json(JSON.parse(request.body).op_type === 'inspect' ? { content_types: [] } : {})) as typeof fetch });
        await expect(client.updateEntries(Post, { values: {} } as any)).rejects.toThrow('explicit filters');
        await expect(client.updateEntries(Post, { filters: {}, values: {} })).rejects.toThrow('Invalid bulk update response');
    });
    test('empty matches return zero counts; default is at most 1000 published updates', async () => {
        const client = createClient({ ...config, fetch: (async (_url: any, request: any) => {
            const body = JSON.parse(request.body); if (body.op_type === 'inspect') return json({ content_types: [] });
            expect(body.limit).toBe(1000); expect(body.published).toBe(true);
            return json({ entries: [], updated_count: 0, failed_count: 0, errors: [] });
        }) as typeof fetch });
        expect(await client.updateEntries(Post, { filters: {}, values: {} })).toEqual({ data: [], updatedCount: 0, failedCount: 0, errors: [] });
    });
});

describe('video reads', () => {
    test('sends nested thumbnail options and preserves video metadata and URLs', async () => {
        const video = { id: 'video', width: 1920, height: 1080, duration: 12, format: 'mp4', byte_size: 1024, output: { url: 'https://example/video.mp4' }, thumbnail: null };
        const client = createClient({ ...config, fetch: (async (_url: any, request: any) => {
            const body = JSON.parse(request.body); if (body.op_type === 'inspect') return json({ content_types: [] });
            expect(body.videos).toEqual({ hero_video: { thumbnail: { width: 400, format: 'webp' } }, references: { author: { intro_video: { thumbnail: { width: 80, height: 80 } } } } });
            return json([{ id: 'post', hero_video: video, clips: [video], author: { id: 'author', intro_video: video } }]);
        }) as typeof fetch });
        const result = await client.getEntries(Post, { preload: ['Author'], videos: { heroVideo: { thumbnail: { width: 400, format: 'webp' } }, references: { author: { introVideo: { thumbnail: { width: 80, height: 80 } } } } } });
        expect(result.data[0]?.heroVideo?.output.url).toBe(video.output.url);
        expect(result.data[0]?.clips?.[0]?.duration).toBe(12);
        expect(result.data[0]?.author?.introVideo?.thumbnail).toBeNull();
    });
});
