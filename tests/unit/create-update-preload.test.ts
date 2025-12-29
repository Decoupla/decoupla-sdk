import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { createClient, defineContentType } from '../../src';

describe('createEntry / updateEntry preload support', () => {
    const ORIGINAL_FETCH = (globalThis as any).fetch;

    beforeEach(() => {
        // noop
    });

    afterEach(() => {
        // restore fetch
        (globalThis as any).fetch = ORIGINAL_FETCH;
    });

    test('createEntry includes normalized preload when provided', async () => {
        const client = createClient({ apiToken: 't', workspace: 'w' });

        let recordedBody: any = null;

        (globalThis as any).fetch = async (url: string, opts: any) => {
            recordedBody = JSON.parse(opts.body);
            return {
                json: async () => ({
                    data: {
                        entry: {
                            id: 'e1', model_id: 'm1', state: 'loaded', last_version: 1, last_published_version: null, created_at: '2025-01-01', updated_at: '2025-01-01'
                        }
                    }
                })
            } as any;
        };

        const Author = defineContentType({
            name: 'author',
            fields: { Name: { type: 'string' } }
        });

        const preloadSpec = [['Author', ['Comments', ['User']]]];

        const meta = await client.createEntry(Author, { Name: 'X' }, { preload: preloadSpec as any });

        expect(meta).toBeDefined();
        expect(recordedBody).toBeTruthy();
        // Expect preload to be normalized to snake_case
        // Note: normalization wraps certain nested tuples, producing an extra array level
        expect(recordedBody.preload).toEqual([['author', [['comments', ['user']]]]]);
    });

    test('updateEntry includes normalized preload when provided', async () => {
        const client = createClient({ apiToken: 't', workspace: 'w' });

        let recordedBody: any = null;

        (globalThis as any).fetch = async (url: string, opts: any) => {
            recordedBody = JSON.parse(opts.body);
            return {
                json: async () => ({
                    data: {
                        entry: {
                            id: 'e2', model_id: 'm1', state: 'loaded', last_version: 2, last_published_version: null, created_at: '2025-01-01', updated_at: '2025-01-02'
                        }
                    }
                })
            } as any;
        };

        const Article = defineContentType({
            name: 'article',
            fields: { Title: { type: 'string' } }
        });

        const preloadSpec = [['Author', ['Profile']]];

        const meta = await client.updateEntry(Article, '00000000-0000-4000-8000-000000000000', { Title: 'Y' }, { preload: preloadSpec as any });

        expect(meta).toBeDefined();
        expect(recordedBody).toBeTruthy();
        // Expect preload to be normalized; single-string inner should be wrapped
        expect(recordedBody.preload).toEqual([['author', ['profile']]]);
    });

    test('no preload when not provided', async () => {
        const client = createClient({ apiToken: 't', workspace: 'w' });

        let recordedBody: any = null;
        (globalThis as any).fetch = async (url: string, opts: any) => {
            recordedBody = JSON.parse(opts.body);
            return { json: async () => ({ data: { entry: { id: 'e3', model_id: 'm1', state: 'loaded', last_version: 1, last_published_version: null, created_at: '2025-01-01', updated_at: '2025-01-01' } } }) } as any;
        };

        const Thing = defineContentType({ name: 'thing', fields: { Name: { type: 'string' } } });
        const meta = await client.createEntry(Thing, { Name: 'Z' });

        expect(meta).toBeDefined();
        expect(recordedBody.preload).toBeUndefined();
    });
});
