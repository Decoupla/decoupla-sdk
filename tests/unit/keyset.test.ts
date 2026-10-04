import { afterEach, expect, test } from 'bun:test';
import { createClient, defineContentType, ApiError } from '../../src';
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });
const Post = defineContentType({ name: 'post', fields: { Title: { type: 'string' }, Score: { type: 'int' } } });
const client = () => createClient({ apiToken: 'test', workspace: 'test' });
const page = (ids: string[], next = false, end: string | null = null) => ({
    entries: ids.map(id => ({ id, title: id })),
    page_info: { start_cursor: ids.length ? 'start' : null, end_cursor: end, has_previous_page: false, has_next_page: next },
});
function mock(handler: (body: any) => any) {
    globalThis.fetch = (async (_url: any, init: any) => {
        const body = JSON.parse(init.body);
        return new Response(JSON.stringify({ data: body.op_type === 'inspect' ? { content_types: [] } : handler(body) }));
    }) as typeof fetch;
}

test('keyset reads normalize entries, expose page metadata and capped counts', async () => {
    mock(body => {
        expect(body).toMatchObject({ keyset: true, after: 'opaque', limit: 2, return_count: true, count_limit: 1000 });
        expect(body.offset).toBeUndefined();
        return { ...page(['1', '2'], true, 'next'), count: 1000, count_is_exact: false };
    });
    const result = await client().getEntries(Post, { keyset: true, after: 'opaque', limit: 2, returnCount: true, countLimit: 1000 });
    expect(result.data.map(entry => entry.title)).toEqual(['1', '2']);
    expect(result.pageInfo.endCursor).toBe('next');
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.count).toBe(1000);
    expect(result.countIsExact).toBe(false);
});

test('backward reads pass the opaque before cursor and no offset', async () => {
    mock(body => { expect(body.before).toBe('backward'); expect(body.offset).toBeUndefined(); return page(['1'], false, 'end'); });
    expect((await client().getEntries(Post, { keyset: true, before: 'backward', limit: 1 })).data[0].id).toBe('1');
});

test('capped counts also work on legacy offset reads', async () => {
    mock(body => { expect(body.count_limit).toBe(2); expect(body.offset).toBe(5); return { entries: [], count: 2, count_is_exact: true }; });
    const result = await client().getEntries(Post, { offset: 5, returnCount: true, countLimit: 2 });
    expect(result.countIsExact).toBe(true);
    expect(result.count).toBe(2);
});

test('cursor iteration preserves query scope and stops on flags, even at exact page size', async () => {
    const cursors: (string | undefined)[] = [];
    mock(body => {
        cursors.push(body.after);
        expect(body).toMatchObject({ keyset: true, limit: 2, api_type: 'preview', filters: { title: { starts_with: 'Post' } }, sort: [{ field: 'score', direction: 'DESC' }], preload: [] });
        expect(body.offset).toBeUndefined();
        return body.after === 'initial' ? page(['1', '2'], true, 'opaque-next') : page(['3', '4'], false, 'end');
    });
    const result = await client().getAllEntries(Post, { keyset: true, after: 'initial', pageSize: 2, contentView: 'preview', filters: { Title: { starts_with: 'Post' } }, sort: [['Score', 'DESC']] });
    expect(result.data.map(entry => entry.id)).toEqual(['1', '2', '3', '4']);
    expect(cursors).toEqual(['initial', 'opaque-next']);
});

test('cursor iteration is lazy and supports empty pages and consumer cancellation', async () => {
    let calls = 0;
    mock(() => { calls++; return page(['1', '2'], true, 'next'); });
    const iterator = client().iterateEntries(Post, { keyset: true, pageSize: 2 });
    expect(calls).toBe(0);
    for await (const entry of iterator) { expect(entry.id).toBe('1'); break; }
    expect(calls).toBe(1);
    mock(() => page([]));
    expect(await client().getAllEntries(Post, { keyset: true })).toEqual({ data: [] });
});

test('invalid combinations fail before network access', async () => {
    globalThis.fetch = (() => { throw new Error('Unexpected network request'); }) as typeof fetch;
    for (const options of [ { keyset: true, offset: 0 }, { after: 'cursor' }, { keyset: true, after: 'a', before: 'b' }, { keyset: true, limit: 501 }, { returnCount: true, countLimit: 0 }, { countLimit: 1000 } ]) {
        await expect(client().getEntries(Post, options as any)).rejects.toThrow();
    }
    await expect(client().getAllEntries(Post, { keyset: true, pageSize: 501 })).rejects.toThrow();
});

test('malformed metadata and missing or repeated next cursors fail without restarting', async () => {
    for (const data of [ { entries: [] }, { ...page([]), page_info: {} } ]) {
        mock(() => data);
        await expect(client().getEntries(Post, { keyset: true })).rejects.toBeInstanceOf(ApiError);
    }
    for (const cursor of [null, 'initial']) {
        mock(() => page(['1'], true, cursor));
        await expect(client().getAllEntries(Post, { keyset: true, after: 'initial' })).rejects.toThrow('next cursor');
    }
});

test('expired cursors propagate the API error instead of restarting exports', async () => {
    globalThis.fetch = (async (_url: any, init: any) => {
        const body = JSON.parse(init.body);
        if (body.op_type === 'inspect') return new Response(JSON.stringify({ data: { content_types: [] } }));
        if (!body.after) return new Response(JSON.stringify({ data: page(['1'], true, 'expired') }));
        return new Response(JSON.stringify({ errors: [{ message: 'Invalid, expired, or mismatched pagination cursor' }] }), { status: 400 });
    }) as typeof fetch;
    await expect(client().getAllEntries(Post, { keyset: true })).rejects.toThrow('HTTP 400');
});


test('a requested count cap requires its exactness flag in the response', async () => {
    mock(() => ({ entries: [], count: 2 }));
    await expect(client().getEntries(Post, { returnCount: true, countLimit: 2 })).rejects.toThrow('capped count metadata');
});
