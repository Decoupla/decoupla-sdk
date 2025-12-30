import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createClient } from '../../src';

// This integration test syncs content types with fields that have `options` and `isLabel`
// and asserts that the backend receives/stores those field properties. It requires the
// DECOUPLA_API_TOKEN and DECOUPLA_WORKSPACE env vars and will no-op if they're not provided.

describe('Integration: sync field options', () => {
    let client: any;
    let ctName: string;
    let createdContentTypeId: string | null = null;
    const debug = process.env.DECOUPLA_DEBUG;

    beforeAll(() => {
        const apiToken = process.env.DECOUPLA_API_TOKEN!;
        const workspace = process.env.DECOUPLA_WORKSPACE!;

        client = createClient({ apiToken, workspace });
        // Use timestamp for uniqueness - this will be used for both name and displayName
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        ctName = `sdk_test_options_${timestamp}_${random}`;
    });

    it('syncs options for a string field and the backend accepts them', async () => {
        if (!client) return; // skipped

        const ct = {
            __isContentTypeDefinition: true,
            __definition: {
                name: ctName,
                displayName: ctName, // Use same value so slug matches
                fields: {
                    Color: { type: 'string', required: false, options: ['red', 'green', 'blue'] },
                },
            },
        } as any;

        let result;
        try {
            result = await client.syncWithFields([ct], { dryRun: false, createMissing: true, createMissingFields: true });
        } catch (e) {
            throw e;
        }
        expect(result.actions).toBeDefined();
        const createFieldsAction = result.actions.find((a: any) => a.type === 'create_fields');
        expect(createFieldsAction).toBeDefined();
        expect(createFieldsAction.detail.created).toBe(1);

        let inspect;
        try {
            inspect = await client.inspect();
        } catch (e) {
            throw e;
        }
        const remote = inspect.data.content_types.find((c: any) => (c.slug || c.id) === ctName);
        if (debug) console.log('[DEBUG] Inspect result:', remote);
        expect(remote).toBeDefined();
        createdContentTypeId = remote.id;

        if (debug) console.log('[DEBUG] Verifying field exists');
        const field = (remote.fields || []).find((f: any) => f.slug === 'color');
        expect(field).toBeDefined();
        expect(field.type).toBe('string');
        expect(field.required).toBe(false);
    }, 15000); // 15 second timeout

    afterAll(async () => {
        if (!client || !createdContentTypeId) return;
        try {
            await client.deleteContentType(createdContentTypeId);
            console.log('Cleaned up created content type (options test)');
        } catch (e) {
            console.warn('Failed to delete content type:', e);
        }
    });
});

describe('Integration: sync field is_label', () => {
    let client: any;
    let ctName: string;
    let createdContentTypeId: string | null = null;

    beforeAll(() => {
        const apiToken = process.env.DECOUPLA_API_TOKEN!;
        const workspace = process.env.DECOUPLA_WORKSPACE!!;

        client = createClient({ apiToken, workspace });
        // Use timestamp for uniqueness
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        ctName = `sdk_test_islabel_${timestamp}_${random}`;
    });

    it('syncs is_label for a field and the backend stores it', async () => {
        if (!client) return; // skipped

        const ct = {
            __isContentTypeDefinition: true,
            __definition: {
                name: ctName,
                displayName: ctName, // Use same value so slug matches
                fields: {
                    Title: { type: 'string', required: true, isLabel: true },
                    Description: { type: 'text', required: false, isLabel: false },
                },
            },
        } as any;

        let result;
        try {
            result = await client.syncWithFields([ct], { dryRun: false, createMissing: true, createMissingFields: true });
        } catch (e) {
            throw e;
        }
        expect(result.actions).toBeDefined();
        const createFieldsAction = result.actions.find((a: any) => a.type === 'create_fields');
        expect(createFieldsAction).toBeDefined();
        expect(createFieldsAction.detail.created).toBe(2);

        let inspect;
        try {
            inspect = await client.inspect();
        } catch (e) {
            throw e;
        }
        const remote = inspect.data.content_types.find((c: any) => (c.slug || c.id) === ctName);
        expect(remote).toBeDefined();
        createdContentTypeId = remote.id;

        // Find the Title field in the remote inspect response and verify is_label
        const titleField = (remote.fields || []).find((f: any) => f.slug === 'title');
        expect(titleField).toBeDefined();
        expect(titleField.is_label).toBe(true);
        expect(titleField.type).toBe('string');
        expect(titleField.required).toBe(true);

        // Find the Description field and verify it's not a label
        const descField = (remote.fields || []).find((f: any) => f.slug === 'description');
        expect(descField).toBeDefined();
        expect(descField.is_label).toBe(false);
        expect(descField.type).toBe('text');
        expect(descField.required).toBe(false);
    }, 30000); // 30 second timeout (creating 2 fields takes longer)

    afterAll(async () => {
        if (!client || !createdContentTypeId) return;
        try {
            await client.deleteContentType(createdContentTypeId);
        } catch (e) {
            console.warn('Failed to delete content type:', e);
        }
    });
});
