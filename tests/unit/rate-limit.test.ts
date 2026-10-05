import { describe, expect, test } from 'bun:test';
import { ApiError, createClient, defineContentType } from '../../src';
import { apiFetch, parseRetryAfter } from '../../src/modules/transport';

const Post = defineContentType({ name: 'post', fields: { Title: { type: 'string' } } });
const config = { apiToken: 'test', workspace: 'w', apiUrl: 'https://api.example/' };
const metadata = { id: 'entry', model_id: 'model', state: 'active', last_version: 1, last_published_version: 1 };
const ok = () => new Response(JSON.stringify({ data: { entry: metadata } }));
const limited = (retryAfter = '0') => () => new Response(
    JSON.stringify({ error: 'Too Many Requests', message: 'This project\'s plan allows 300 API requests per minute.' }),
    { status: 429, headers: { 'retry-after': retryAfter } },
);

const sequence = (...responses: (() => Response)[]) => {
    const calls: unknown[] = [];
    const fetch = (async (url: string, init: RequestInit) => {
        calls.push(init.body);
        const next = responses[Math.min(calls.length - 1, responses.length - 1)];
        return next!();
    }) as unknown as typeof globalThis.fetch;
    return { fetch, calls };
};

describe('rate limiting', () => {
    test('retries a 429 after Retry-After and returns the next response', async () => {
        const { fetch, calls } = sequence(limited(), limited(), ok);
        const client = createClient({ ...config, fetch });
        expect((await client.getEntry(Post, 'entry')).data.id).toBe('entry');
        expect(calls).toHaveLength(3);
    });

    test('retries writes with the same body, since a limited request never ran', async () => {
        const { fetch, calls } = sequence(limited(), ok);
        const client = createClient({ ...config, fetch });
        await client.createEntry(Post, { Title: 'Hello' });
        expect(calls).toHaveLength(2);
        expect(calls[1]).toBe(calls[0]);
    });

    test('gives up after maxRetries with a rate limit error carrying Retry-After', async () => {
        const { fetch, calls } = sequence(limited());
        const client = createClient({ ...config, fetch, maxRetries: 2 });
        const error = await client.getEntry(Post, 'entry').catch(error => error);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.isRateLimitError).toBe(true);
        expect(error.retryAfterSeconds).toBe(0);
        expect(error.message).toContain('300 API requests per minute');
        expect(calls).toHaveLength(3);
    });

    test('a per-call maxRetries overrides the client default', async () => {
        const { fetch, calls } = sequence(limited());
        const client = createClient({ ...config, fetch });
        await client.getEntry(Post, 'entry', { maxRetries: 0 }).catch(() => {});
        expect(calls).toHaveLength(1);
    });

    test('other errors are not retried', async () => {
        const { fetch, calls } = sequence(() => new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), { status: 500 }));
        await apiFetch('https://api.example', {}, 1000, fetch).catch(() => {});
        expect(calls).toHaveLength(1);
    });

    test('aborting while waiting to retry stops immediately', async () => {
        const { fetch, calls } = sequence(limited('30'));
        const controller = new AbortController();
        const pending = apiFetch('https://api.example', { signal: controller.signal }, 1000, fetch).catch(error => error);
        await new Promise(resolve => setTimeout(resolve, 10));
        controller.abort();
        expect(await pending).toMatchObject({ name: 'AbortError' });
        expect(calls).toHaveLength(1);
    });

    test('Retry-After accepts seconds or an HTTP date', () => {
        expect(parseRetryAfter('12')).toBe(12);
        expect(parseRetryAfter(new Date(10_000).toUTCString(), 1_000)).toBe(9);
        expect(parseRetryAfter('soon')).toBeUndefined();
        expect(parseRetryAfter(null)).toBeUndefined();
    });
});
