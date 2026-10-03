import { afterEach, describe, expect, test } from 'bun:test';
import { createClient, defineContentType, ApiError } from '../../src';
import { syncSchemas } from '../../src/cli/sync';
import { buildCreateContentTypeRequest } from '../../src/modules/sync-api';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const client = () => createClient({ apiToken: 'placeholder', workspace: 'placeholder' });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const denied = { errors: [{ field: 'authorization', message: 'Missing permission' }] };
const remote = { data: { content_types: [{ id: 'ct-1', slug: 'post', fields: [
    { id: 'f-1', slug: 'title', type: 'string', required: true, is_label: false },
] }] } };
const config = (contentTypes: any[]) => ({ apiToken: 'placeholder', workspace: 'placeholder', contentTypes });
const post = defineContentType({ name: 'post', fields: { Title: { type: 'string' } } });

function mockFetch(handler: (body: any) => Response | Promise<Response>) {
    globalThis.fetch = (async (_url: any, opts: any) => handler(
        opts.body instanceof FormData ? { op_type: opts.body.get('op_type') } : JSON.parse(opts.body)
    )) as typeof fetch;
}

describe('API transport and token capabilities', () => {
    test('preserves status and structured authorization details', async () => {
        mockFetch(() => json(denied, 400));
        try { await client().inspect(); throw new Error('Expected failure'); }
        catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).status).toBe(400);
            expect((error as ApiError).errors).toEqual(denied.errors);
        }
        expect(await client().validateContentView('preview')).toBe(false);
    });
    test('checks the requested view and rejects draft access on a published-only token', async () => {
        const bodies: any[] = [];
        mockFetch(body => { bodies.push(body); return body.op_type === 'inspect' ? json(remote) : json(denied, 400); });
        expect(await client().validateContentView('preview')).toBe(false);
        expect(bodies[1].api_type).toBe('preview');
    });
    test('empty workspace does not claim preview capability', async () => {
        mockFetch(() => json({ data: { content_types: [] } }));
        expect(await client().validateContentView('preview')).toBe(false);
    });
    test('successful view probe returns true', async () => {
        mockFetch(body => json(body.op_type === 'inspect' ? remote : { data: [] }));
        expect(await client().validateContentView('live')).toBe(true);
    });
    test('nonstandard HTTP failures throw and do not become permission denials', async () => {
        mockFetch(() => json({ error: 'Unavailable' }, 503));
        await expect(client().inspect()).rejects.toThrow('HTTP 503');
        await expect(client().validateContentView('preview')).rejects.toThrow('HTTP 503');
    });
    test('malformed responses do not expose raw response contents', async () => {
        globalThis.fetch = (async () => new Response('private response data', { status: 502 })) as typeof fetch;
        await expect(client().inspect()).rejects.toThrow('Invalid JSON response (HTTP 502)');
        mockFetch(() => json({ data: {} }));
        await expect(client().inspect()).rejects.toThrow('Invalid API response for inspect');
    });
    test('all writes and uploads reject nonstandard HTTP errors', async () => {
        mockFetch(() => json({ error: 'Forbidden' }, 403));
        await expect(client().createEntry(post, { Title: 'Test' }, false)).rejects.toThrow('HTTP 403');
        await expect(client().updateEntry(post, '00000000-0000-4000-8000-000000000001', { Title: 'Test' }, false)).rejects.toThrow('HTTP 403');
        await expect(client().deleteContentType('00000000-0000-4000-8000-000000000001')).rejects.toThrow('HTTP 403');
        await expect(client().upload(new File(['test'], 'test.png'))).rejects.toThrow('HTTP 403');
    });
    test('aborts requests that exceed the configured timeout', async () => {
        globalThis.fetch = ((_url: any, opts: any) => new Promise((_resolve, reject) => {
            opts.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        })) as typeof fetch;
        await expect(createClient({ apiToken: 'placeholder', workspace: 'placeholder', requestTimeoutMs: 5 }).inspect())
            .rejects.toThrow('timed out after 5ms');
    });
    test('read requests select live by default and allow explicit preview', async () => {
        const views: string[] = [];
        mockFetch(body => { if (body.op_type === 'inspect') return json(remote); views.push(body.api_type); return json({ data: [] }); });
        await client().getEntries(post);
        await client().getEntries(post, { contentView: 'preview' });
        expect(views).toEqual(['live', 'preview']);
    });
});

describe('schema synchronization', () => {
    test('failed field update is unsuccessful and not counted as completed', async () => {
        mockFetch(body => body.op_type === 'inspect' ? json(remote) : json(denied, 400));
        const result = await syncSchemas(config([{ name: 'post', schema: { Title: { type: 'string', required: false } } }]));
        expect(result.success).toBe(false);
        expect(result.changes?.updated).toEqual([]);
        expect(result.changes?.errors[0].error).toContain('Missing permission');
    });
    test('failed creations and deletions are preserved as errors', async () => {
        mockFetch(() => json(remote));
        const fail = async () => { throw new Error('mutation denied'); };
        const fields = await client().syncWithFields([{ name: 'post', fields: { Other: { type: 'string' } } }],
            { dryRun: false, deleteExtraFields: true, createField: fail, deleteField: fail });
        expect(fields.actions.map(a => a.type)).toEqual(['mismatch']);
        expect(fields.actions[0].detail.message).toContain('Create field Other');
        expect(fields.actions[0].detail.message).toContain('Delete field f-1');
        const types = await client().syncWithFields([{ name: 'missing', fields: {} }], { dryRun: false, createContentType: fail });
        expect(types.actions.map(a => a.type)).toEqual(['mismatch']);
    });
    test('malformed success responses cannot count a field write as successful', async () => {
        mockFetch(body => body.op_type === 'inspect' ? json(remote) : json({ data: {} }));
        const result = await syncSchemas(config([{ name: 'post', schema: { Title: { type: 'string' } } }]));
        expect(result.success).toBe(false);
        expect(result.changes?.updated).toEqual([]);
        expect(result.changes?.errors[0].error).toContain('missing field ID');
    });
    test('inspection failure prevents every mutation' , async () => {
        let writes = 0;
        mockFetch(body => { if (body.op_type !== 'inspect') writes++; return json({ error: 'Unavailable' }, 503); });
        await expect(client().syncWithFields([{ name: 'post', fields: {} }], { dryRun: false })).rejects.toThrow('HTTP 503');
        await expect(client().sync([{ name: 'post', fields: {} }], { dryRun: false })).rejects.toThrow('HTTP 503');
        expect(writes).toBe(0);
    });
    test('dry-run plans missing types, fields and updates without mutations', async () => {
        const operations: string[] = [];
        mockFetch(body => { operations.push(body.op_type); return json(remote); });
        const result = await syncSchemas(config([
            { name: 'missing', schema: { Name: { type: 'string' } } },
            { name: 'post', schema: { Title: { type: 'string', required: false }, Body: { type: 'text' } } },
        ]), { dryRun: true });
        expect(result.success).toBe(true);
        expect(result.changes?.created).toEqual(['missing']);
        expect(result.changes?.updated).toContain('post');
        expect(result.changes?.unchanged).toEqual([]);
        expect(operations).toEqual(['inspect']);
    });
    test('counts mixed successful operations without hiding failures', async () => {
        mockFetch(() => json(remote));
        const result = await client().syncWithFields([{ name: 'post', fields: { Title: { type: 'string' }, Other: { type: 'string' } } }], {
            dryRun: false, createField: async () => ({}), updateField: async () => { throw new Error('update denied'); },
        });
        expect(result.actions.map(a => a.type)).toEqual(['mismatch', 'create_fields']);
        expect(result.actions[1].detail.created).toBe(1);
    });
    test('PascalCase matching never deletes a desired field', async () => {
        mockFetch(() => json(remote));
        let deletes = 0;
        const result = await client().syncWithFields([{ name: 'post', fields: { Title: { type: 'string', required: true } } }], {
            dryRun: false, deleteExtraFields: true, deleteField: async () => { deletes++; },
        });
        expect(deletes).toBe(0);
        expect(result.actions.map(a => a.type)).toEqual(['noop']);
    });
    test('custom display labels do not change remote content-type identity', async () => {
        expect(buildCreateContentTypeRequest({ name: 'post', displayName: 'Articles', fields: {} }).name).toBe('post');
        expect(() => buildCreateContentTypeRequest({ name: 'Blog Post', fields: {} })).toThrow('snake_case slug');
        let created = false;
        let fieldWrites = 0;
        const names: string[] = [];
        mockFetch(body => {
            if (body.op_type === 'inspect') return json({ data: { content_types: created ? [{ id: 'new-id', slug: 'post', fields: [] }] : [] } });
            if (body.op_type === 'create_content_type') { created = true; names.push(body.name); return json({ data: { content_type: { id: 'new-id', slug: 'post' } } }); }
            fieldWrites++; expect(body.content_type_id).toBe('new-id'); return json({ data: { field: { id: 'new-field' } } });
        });
        const result = await client().syncWithFields([{ name: 'post', displayName: 'Articles', fields: { Title: { type: 'string' } } }], { dryRun: false });
        expect(names).toEqual(['post']); expect(fieldWrites).toBe(1);
        expect(result.actions.map(a => a.type)).toEqual(['create', 'create_fields']);
    });
    test('failed refresh prevents field writes after type creation', async () => {
        let inspections = 0; let fields = 0;
        mockFetch(body => {
            if (body.op_type === 'inspect') return ++inspections === 1 ? json({ data: { content_types: [] } }) : json({ error: 'Unavailable' }, 503);
            if (body.op_type === 'create_field') fields++;
            return json({ data: { content_type: { id: 'created' } } });
        });
        await expect(client().syncWithFields([{ name: 'post', fields: { Title: { type: 'string' } } }], { dryRun: false })).rejects.toThrow('HTTP 503');
        expect(fields).toBe(0);
    });
});

test('CLI loader resolves from its package, independent of caller directory', () => {
    const root = mkdtempSync('/tmp/decoupla-cli-test-');
    try {
        const pkg = path.join(root, 'package');
        mkdirSync(path.join(pkg, 'bin'), { recursive: true });
        mkdirSync(path.join(pkg, 'dist/cli'), { recursive: true });
        mkdirSync(path.join(pkg, 'node_modules/esbuild-register/dist'), { recursive: true });
        copyFileSync(path.resolve('bin/decoupla.cjs'), path.join(pkg, 'bin/decoupla.cjs'));
        writeFileSync(path.join(pkg, 'node_modules/esbuild-register/dist/node.js'), 'global.loaderReady = true;');
        writeFileSync(path.join(pkg, 'dist/cli/index.cjs'), 'if (!global.loaderReady) process.exit(2); console.log("loader ready");');
        const result = spawnSync('node', [path.join(pkg, 'bin/decoupla.cjs'), '--version'], { cwd: root, encoding: 'utf8' });
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('loader ready');
    } finally { rmSync(root, { recursive: true, force: true }); }
});
