import { describe, expect, test } from 'bun:test';
import { createClient, ApiError } from '../../src';

const json = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status });
const staged = { upload_id: 'staged-upload', url: 'https://storage.example/staged?signature=private', content_type: 'image/png' };
const media = { id: 'image-id', type: 'image', width: 1, height: 1, format: 'png', byte_size: 5 };
const makeClient = (fetch: typeof globalThis.fetch, extra = {}) => createClient({
    apiToken: 'private-api-token', workspace: 'workspace', apiUrl: 'https://api.example/workspaces', fetch, ...extra,
});

describe('direct uploads', () => {
    test('defaults to prepare, raw PUT, finalize and preserves metadata', async () => {
        const calls: string[] = [];
        const file = new File(['image'], 'test.png', { type: 'image/png' });
        const client = makeClient((async (url: any, init: any) => {
            if (init.method === 'PUT') {
                calls.push('put');
                expect(url).toBe(staged.url);
                expect(init.body).toBe(file);
                expect(init.headers).toEqual({ 'Content-Type': 'image/png' });
                expect(init.credentials).toBe('omit');
                expect(init.redirect).toBe('error');
                return new Response(null, { status: 200 });
            }
            expect(url).toBe('https://api.example/workspaces/workspace');
            expect(init.headers.Authorization).toBe('Bearer private-api-token');
            const body = JSON.parse(init.body);
            calls.push(body.op_type);
            if (body.op_type === 'prepare_upload') {
                expect(body).toEqual({ op_type: 'prepare_upload', byte_size: '5', content_type: 'image/png' });
                return json({ upload: staged });
            }
            expect(body).toEqual({ op_type: 'complete_upload', upload_id: staged.upload_id });
            return json({ file: media });
        }) as typeof fetch);
        expect(await client.upload(file)).toEqual(media);
        expect(calls).toEqual(['prepare_upload', 'put', 'complete_upload']);
    });

    test('infers MIME type for a Blob without metadata', async () => {
        const client = makeClient((async (_url: any, init: any) => {
            if (init.method === 'PUT') {
                expect(init.headers['Content-Type']).toBe('image/png');
                return new Response(null);
            }
            const body = JSON.parse(init.body);
            if (body.op_type === 'prepare_upload') {
                expect(body.content_type).toBe('image/png');
                return json({ upload: staged });
            }
            return json({ file: media });
        }) as typeof fetch);
        await client.upload(new Blob(['image']), 'image.PNG');
    });

    test('multipart remains available at client and per-call level', async () => {
        const client = makeClient((async (_url: any, init: any) => {
            expect(init.body).toBeInstanceOf(FormData);
            expect(init.body.get('op_type')).toBe('upload_file');
            expect(init.headers.Authorization).toBe('Bearer private-api-token');
            return json({ file: media });
        }) as typeof fetch, { uploadStrategy: 'multipart' });
        expect(await client.upload(new File(['image'], 'test.png'))).toEqual(media);
        const direct = makeClient(clientFetch, {});
        async function clientFetch(_url: any, init: any) {
            expect(init.body).toBeInstanceOf(FormData);
            return json({ file: media });
        }
        await direct.upload(new File(['image'], 'test.png'), undefined, { uploadStrategy: 'multipart' });
    });

    test('plan rejection stops before PUT and is not downgraded to multipart', async () => {
        let calls = 0;
        const client = makeClient((async () => {
            calls++;
            return new Response(JSON.stringify({ errors: [{ field: 'file', message: 'Media storage limit exceeded' }] }), { status: 400 });
        }) as typeof fetch);
        await expect(client.upload(new File(['image'], 'test.png'))).rejects.toThrow('Media storage limit exceeded');
        expect(calls).toBe(1);
    });

    test('storage XML failure stops finalization and never logs raw response or signed URL', async () => {
        let calls = 0;
        const client = makeClient((async (_url: any, init: any) => {
            calls++;
            if (init.method === 'PUT') return new Response('<Error><Code>SignatureDoesNotMatch</Code><Message>private-secret</Message></Error>', { status: 403 });
            return json({ upload: staged });
        }) as typeof fetch);
        const error = await client.upload(new File(['image'], 'test.png')).catch(e => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(403);
        expect(error.message).toContain('SignatureDoesNotMatch');
        expect(error.message).not.toContain('private');
        expect(calls).toBe(2);
    });

    test('cancellation during PUT stops finalization even if custom fetch ignores abort', async () => {
        const controller = new AbortController();
        let start!: () => void;
        const started = new Promise<void>(resolve => { start = resolve; });
        let calls = 0;
        const client = makeClient((async (_url: any, init: any) => {
            calls++;
            if (init.method === 'PUT') { start(); return new Promise(() => {}); }
            return json({ upload: staged });
        }) as typeof fetch);
        const pending = client.upload(new File(['image'], 'test.png'), undefined, { signal: controller.signal }).catch(e => e);
        await started;
        controller.abort();
        expect(await pending).toMatchObject({ name: 'AbortError' });
        expect(calls).toBe(2);
    });

    test('timeout applies to the PUT', async () => {
        const client = makeClient((async (_url: any, init: any) => {
            if (init.method === 'PUT') return new Promise(() => {});
            return json({ upload: staged });
        }) as typeof fetch);
        await expect(client.upload(new File(['image'], 'test.png'), undefined, { requestTimeoutMs: 5 })).rejects.toThrow('timed out after 5ms');
    });

    test('invalid preparation and completion responses fail explicitly', async () => {
        for (const upload of [undefined, { ...staged, url: 'http://storage.example' }, { ...staged, url: 'invalid' }]) {
            const client = makeClient((async () => json({ upload })) as typeof fetch);
            await expect(client.upload(new File(['image'], 'test.png'))).rejects.toThrow('Invalid');
        }
        const client = makeClient((async (_url: any, init: any) => {
            if (init.method === 'PUT') return new Response(null);
            return JSON.parse(init.body).op_type === 'prepare_upload' ? json({ upload: staged }) : json({ file: {} });
        }) as typeof fetch);
        await expect(client.upload(new File(['image'], 'test.png'))).rejects.toThrow('Invalid complete-upload response');
    });

    test('429 retry of completion reuses its upload ID and does not repeat PUT', async () => {
        let completions = 0, puts = 0;
        const client = makeClient((async (_url: any, init: any) => {
            if (init.method === 'PUT') { puts++; return new Response(null); }
            const body = JSON.parse(init.body);
            if (body.op_type === 'prepare_upload') return json({ upload: staged });
            expect(body.upload_id).toBe(staged.upload_id);
            if (++completions === 1) return new Response(JSON.stringify({ errors: [{ message: 'Rate limited' }] }), { status: 429, headers: { 'retry-after': '0' } });
            return json({ file: media });
        }) as typeof fetch);
        expect(await client.upload(new File(['image'], 'test.png'))).toEqual(media);
        expect(puts).toBe(1);
        expect(completions).toBe(2);
    });
});
