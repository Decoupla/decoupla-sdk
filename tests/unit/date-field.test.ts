import { describe, expect, test, afterEach } from 'bun:test';
import { createClient, defineContentType } from '../../src';

describe('date field formatting', () => {
    const ORIGINAL_FETCH = (globalThis as any).fetch;

    afterEach(() => {
        (globalThis as any).fetch = ORIGINAL_FETCH;
    });

    test('createEntry converts Date object to YYYY-MM-DD', async () => {
        const client = createClient({ apiToken: 't', workspace: 'w' });

        let recordedBody: any = null;
        (globalThis as any).fetch = async (url: string, opts: any) => {
            recordedBody = JSON.parse(opts.body);
            return { json: async () => ({ data: { entry: { id: 'e1', model_id: 'm1', state: 'loaded', last_version: 1, last_published_version: null, created_at: '2025-01-01', updated_at: '2025-01-01' } } }) } as any;
        };

        const Event = defineContentType({ name: 'event', fields: { StartDate: { type: 'date', required: true } } });

        const inputDate = new Date('2025-12-29T15:30:00Z');
        const meta = await client.createEntry(Event, { StartDate: inputDate }, false as any);

        expect(recordedBody).toBeTruthy();
        const expected = (() => {
            const d = new Date(inputDate);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${da}`;
        })();
        expect(recordedBody.field_values.StartDate).toBe(expected);
    });

    test('createEntry preserves YYYY-MM-DD string as-is', async () => {
        const client = createClient({ apiToken: 't', workspace: 'w' });

        let recordedBody: any = null;
        (globalThis as any).fetch = async (url: string, opts: any) => {
            recordedBody = JSON.parse(opts.body);
            return { json: async () => ({ data: { entry: { id: 'e2', model_id: 'm1', state: 'loaded', last_version: 1, last_published_version: null, created_at: '2025-01-01', updated_at: '2025-01-01' } } }) } as any;
        };

        const Event = defineContentType({ name: 'event', fields: { StartDate: { type: 'date', required: true } } });

        const dateStr = '2025-12-29';
        const meta = await client.createEntry(Event, { StartDate: dateStr }, false as any);

        expect(recordedBody).toBeTruthy();
        expect(recordedBody.field_values.StartDate).toBe(dateStr);
    });
});
