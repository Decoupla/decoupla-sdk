import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createClient, defineContentType } from '../../src';

// This integration test syncs content types with fields that have `options` and `isLabel`
// and asserts that the backend receives/stores those field properties. It requires the
// DECOUPLA_API_TOKEN and DECOUPLA_WORKSPACE env vars and will no-op if they're not provided.

describe('Integration: sync field options', () => {
    let client: ReturnType<typeof createClient>;
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

        const ct = defineContentType({
            name: ctName,
            displayName: ctName,
            fields: {
                Color: {
                    type: 'string' as const,
                    required: false,
                    options: ['red', 'green', 'blue'],
                },
            },
        })

        let result;
        try {
            result = await client.syncWithFields([ct], { dryRun: false, createMissing: true, createMissingFields: true });
        } catch (e) {
            throw e;
        }
        expect(result.actions).toBeDefined();
        const createFieldsAction = result.actions.find((a: any) => a.type === 'create_fields');
        expect(createFieldsAction).toBeDefined();
        expect(createFieldsAction!.detail.created).toBe(1);

        let inspect;
        try {
            inspect = await client.inspect();
        } catch (e) {
            throw e;
        }
        const remote = inspect.data.content_types.find((c: any) => (c.slug || c.id) === ctName);
        expect(remote).toBeDefined();
        createdContentTypeId = remote!.id;

        const field = (remote!.fields || []).find((f: any) => f.slug === 'color');
        expect(field).toBeDefined();
        expect(field!.type).toBe('string');
        expect(field!.required).toBe(false);
        expect(field!.options).toEqual(['red', 'green', 'blue']);
    });

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
    let client: ReturnType<typeof createClient>;
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

        const ct = defineContentType({
            name: ctName,
            displayName: ctName,
            fields: {
                Title: {
                    type: 'string' as const,
                    required: true,
                    isLabel: true,
                },
                Description: {
                    type: 'text' as const,
                    required: false,
                    isLabel: false,
                },
            },
        });

        let result;
        try {
            result = await client.syncWithFields([ct], { dryRun: false, createMissing: true, createMissingFields: true });
        } catch (e) {
            throw e;
        }
        expect(result.actions).toBeDefined();
        const createFieldsAction = result.actions.find((a: any) => a.type === 'create_fields');
        expect(createFieldsAction).toBeDefined();
        expect(createFieldsAction!.detail.created).toBe(2);

        let inspect;
        try {
            inspect = await client.inspect();
        } catch (e) {
            throw e;
        }
        const remote = inspect.data.content_types.find((c: any) => (c.slug || c.id) === ctName);
        expect(remote).toBeDefined();
        createdContentTypeId = remote!.id;

        // Find the Title field in the remote inspect response and verify is_label
        const titleField = (remote!.fields || []).find((f: any) => f.slug === 'title');
        expect(titleField).toBeDefined();
        expect(titleField!.is_label).toBe(true);
        expect(titleField!.type).toBe('string');
        expect(titleField!.required).toBe(true);
        // Find the Description field and verify it's not a label
        const descField = (remote!.fields || []).find((f: any) => f.slug === 'description');
        expect(descField).toBeDefined();
        expect(descField!.is_label).toBe(false);
        expect(descField!.type).toBe('text');
        expect(descField!.required).toBe(false);
    });

    afterAll(async () => {
        if (!client || !createdContentTypeId) return;
        try {
            await client.deleteContentType(createdContentTypeId);
        } catch (e) {
            console.warn('Failed to delete content type:', e);
        }
    });
});

describe('Integration: sync field is_label and options via update', () => {

    let client: ReturnType<typeof createClient>;
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

    it('updates field to set is_label and options', async () => {

        const ct1 = defineContentType({
            name: ctName,
            displayName: ctName,
            fields: {
                Status: {
                    type: 'string' as const,
                    required: false,
                },
            },
        });

        // Initial sync to create content type and field
        await client.syncWithFields([ct1], { dryRun: false, createMissing: true, createMissingFields: true });

        // Now define updated content type with isLabel and options
        const ct2 = defineContentType({
            name: ctName,
            displayName: ctName,
            fields: {
                Status: {
                    type: 'string' as const,
                    required: false,
                    isLabel: true,
                    options: ['draft', 'published', 'archived'],
                },
            },
        });

        // Sync again to apply updates
        await client.syncWithFields([ct2], { dryRun: false, createMissing: false, createMissingFields: false });

        // Inspect and verify
        let inspect;
        try {
            inspect = await client.inspect();
        } catch (e) {
            throw e;
        }
        const remote = inspect.data.content_types.find((c: any) => (c.slug || c.id) === ctName);
        expect(remote).toBeDefined();
        createdContentTypeId = remote!.id;

        const statusField = (remote!.fields || []).find((f: any) => f.slug === 'status');
        expect(statusField).toBeDefined();
        expect(statusField!.is_label).toBe(true);
        expect(statusField!.type).toBe('string');
        expect(statusField!.required).toBe(false);
        expect(statusField!.options).toEqual(['draft', 'published', 'archived']);

    })

    afterAll(async () => {
        if (!client || !createdContentTypeId) return;
        try {
            await client.deleteContentType(createdContentTypeId);
        } catch (e) {
            console.warn('Failed to delete content type:', e);
        }
    });
});

describe('Integration: should throw error when changing field type', () => {

    let client: ReturnType<typeof createClient>;
    let ctName: string;
    let createdContentTypeId: string | null = null;

    beforeAll(() => {
        const apiToken = process.env.DECOUPLA_API_TOKEN!;
        const workspace = process.env.DECOUPLA_WORKSPACE!!;

        client = createClient({ apiToken, workspace });
        // Use timestamp for uniqueness
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        ctName = `sdk_test_typechange_${timestamp}_${random}`;
    });

    it('throws error when changing field type on sync', async () => {

        const ct1 = defineContentType({
            name: ctName,
            displayName: ctName,
            fields: {
                Count: {
                    type: 'int' as const,
                    required: true,
                },
            },
        });

        // Initial sync to create content type and field
        await client.syncWithFields([ct1], { dryRun: false, createMissing: true, createMissingFields: true });

        // Now define updated content type with changed field type
        const ct2 = defineContentType({
            name: ctName,
            displayName: ctName,
            fields: {
                Count: {
                    type: 'string' as const, // changed from number to string
                    required: true,
                },
            },
        });

        // Sync again to apply updates - should throw error
        let caughtError = null;
        try {
            await client.syncWithFields([ct2], { dryRun: false, createMissing: false, createMissingFields: false });
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError).toBeDefined();
        expect((caughtError as Error).message).toMatch(/Field type mismatch for field "Count"/);

    })

    afterAll(async () => {
        if (!client || !createdContentTypeId) return;
        try {
            await client.deleteContentType(createdContentTypeId);
        } catch (e) {
            console.warn('Failed to delete content type:', e);
        }
    });
});