/**
 * Setup Test Content Types on Backend
 * 
 * This script:
 * 1. Deletes all existing test content types
 * 2. Creates fresh content types using sync with the definitions from config
 * 
 * Run with: bun tests/setup.ts
 */

import { createClient } from "../src";
import config from "./decoupla.config";

const API_TOKEN = config.apiToken;
const WORKSPACE = config.workspace;

if (!API_TOKEN || !WORKSPACE) {
    console.error('Missing credentials in decoupla.config.ts');
    process.exit(1);
}

const DECOUPLA_API_URL_BASE = "https://api.decoupla.com/public/api/1.0/workspace/";

// Helper to make API requests (for creating fields, etc.)
async function apiRequest(body: any) {
    const response = await fetch(`${DECOUPLA_API_URL_BASE}${WORKSPACE}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(body),
    });

    return response.json();
}

// Clean up ALL existing content types
async function cleanupExistingContentTypes() {
    console.log('🧹 Cleaning up ALL content types...\n');

    const cleanupConfig = createClient({
        apiToken: API_TOKEN!,
        workspace: WORKSPACE!
    });

    try {
        const inspectResult = await cleanupConfig.inspect();
        const allContentTypes = inspectResult.data.content_types;

        for (const ct of allContentTypes) {
            console.log(`  Deleting ${ct.id}...`);
            try {
                await cleanupConfig.deleteContentType(ct.id);
                console.log(`  ✓ Deleted ${ct.id}`);
            } catch (error) {
                console.warn(`  ⚠ Could not delete ${ct.id}:`, error);
            }
        }

        if (allContentTypes.length === 0) {
            console.log('  No content types found to delete');
        }
    } catch (error) {
        console.warn('  Warning: Could not cleanup content types:', error);
    }

    console.log();
}

async function setupContentTypes(options: { skipCleanup?: boolean } = {}) {
    const { skipCleanup = false } = options;
    console.log('\n🔧 Setting up test content types using sync...\n');

    // Optionally clean up all existing content types first. Tests may set skipCleanup to true
    // to avoid a full cleanup when only creating missing types.
    if (!skipCleanup) {
        await cleanupExistingContentTypes();
    }

    const configApi = createClient({
        apiToken: API_TOKEN!,
        workspace: WORKSPACE!
    });

    try {
        console.log('📝 Creating content types...\n');

        const contentTypes = config.contentTypes;

        // Create content type callback for sync
        const createContentType = async (ct: any) => {
            const body = {
                op_type: 'create_content_type',
                name: ct.name,
                display_name: ct.displayName,
                description: ct.description,
            };

            const response = await apiRequest(body) as any;

            if (response.errors) {
                console.warn(`    ⚠ Could not create content type: ${response.errors[0]?.message}`);
                throw new Error(`Failed to create content type: ${response.errors[0]?.message}`);
            }

            console.log(`    ✓ Content type created via callback`);
            return response.data?.content_type?.id;
        };

        // First, sync to create the content types (with createContentType callback)
        for (const ct of contentTypes) {
            const definition = ct.__definition;
            console.log(`  Creating ${definition.name}...`);

            await configApi.syncWithFields([ct], {
                dryRun: false,
                createMissing: true,
                createMissingFields: false, // We'll handle fields separately
                createContentType, // Provide the callback
            });

            console.log(`  ✓ ${definition.displayName || definition.name} created`);
        }

        // Now create/update fields for each content type
        console.log('\n📝 Creating fields...\n');

        const inspectResult = await configApi.inspect();

        // Build a map of content type names (slugs) to their UUIDs for reference resolution
        const contentTypeNameToUuid = new Map<string, string>();
        inspectResult.data.content_types.forEach((rct: any) => {
            // rct.id is the UUID, rct.slug is the name/key
            contentTypeNameToUuid.set(rct.slug || rct.id, rct.id);
        });

        for (const ct of contentTypes) {
            const definition = ct.__definition;
            console.log(`  Creating fields for ${definition.name}...`);

            // Find the content type in inspect result by name (id field contains the UUID, slug is the name)
            const remoteContentType = inspectResult.data.content_types.find(
                (rct: any) => rct.id === definition.name || rct.slug === definition.name || rct.name === definition.name
            );

            if (!remoteContentType) {
                console.warn(`  ⚠ Content type ${definition.name} not found in inspect result`);
                console.warn(`  Available content types: ${inspectResult.data.content_types.map((c: any) => `${c.id} (${c.name})`).join(', ')}`);
                continue;
            }

            console.log(`    ✓ Found content type with id: ${remoteContentType.id}`);

            // Create or update each field
            for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
                const fieldData: any = {
                    op_type: 'create_field',
                    content_type_id: remoteContentType.id,
                    name: fieldName,
                    type: (fieldDef as any).type,
                    required: (fieldDef as any).required ?? false,
                    is_label: (fieldDef as any).isLabel ?? false,
                };

                // Handle reference fields - put reference_types (UUIDs) in meta
                if (((fieldDef as any).type === 'reference' || (fieldDef as any).type === 'reference[]') && (fieldDef as any).references) {
                    const refUuids = (fieldDef as any).references
                        .map((ref: any) => {
                            const refName = typeof ref === 'string' ? ref : ref.__definition.name;
                            // Look up the UUID for this reference name
                            return contentTypeNameToUuid.get(refName) || refName;
                        });
                    fieldData.meta = {
                        reference_types: refUuids
                    };
                }

                const response = await apiRequest(fieldData) as any;

                if (response.errors) {
                    console.warn(`    ⚠ Could not create field ${fieldName}: ${response.errors[0]?.message}`);
                    if (fieldData.meta) {
                        console.warn(`       Field data was: ${JSON.stringify(fieldData)}`);
                    }
                } else {
                    console.log(`    ✓ Field ${fieldName} created`);
                }
            }
        }

        console.log('\n✅ Content type setup complete!\n');
        console.log('📋 All content types are defined in: tests/fixtures/content-types.ts\n');
        console.log('Usage in tests:');
        console.log('  import { AuthorContentType, CategoryContentType, BlogPostContentType } from "../fixtures/content-types";\n');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    // When run as a script, perform setup immediately.
    setupContentTypes();
}

// Export for other tests to call programmatically.
export default setupContentTypes;
