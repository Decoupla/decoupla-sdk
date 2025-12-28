/**
 * Schema synchronization CLI command
 * 
 * Syncs local schema definitions with the remote backend.
 */

import type { DecoupiaConfig } from './config-loader';
import { schemaToContentType } from './config-loader';
import { createClient } from '../index';
import { debug } from '../utils/logger';
import type { ContentTypeDefinition } from '../types/index';
import type { NormalizedContentType } from './generate';

// ============================================
// SYNC COMMAND
// ============================================

/**
 * Options for sync operation
 */
export interface SyncOptions {
    /** If true, apply changes automatically without prompting */
    autoApply?: boolean;
    /** If true, only show what would change without applying */
    dryRun?: boolean;
    /** If true, show detailed diff information */
    verbose?: boolean;
}

/**
 * Sync operation result
 */
export interface SyncResult {
    success: boolean;
    message: string;
    changes?: {
        created: string[];
        updated: string[];
        unchanged: string[];
        errors: Array<{ name: string; error: string }>;
    };
}

/**
 * Execute schema sync
 * 
 * Fetches remote schemas and compares with local definitions,
 * then applies necessary changes (create/update).
 */
export async function syncSchemas(
    config: DecoupiaConfig,
    options: SyncOptions = {}
): Promise<SyncResult> {
    try {
        // Initialize API client
        const apiConfig = createClient({
            apiToken: config.apiToken,
            workspace: config.workspace,
        });

        console.log('📡 Syncing schemas with remote...');

        // Normalize and convert schemas to content type definitions
        const contentTypeDefs = config.contentTypes.map(ct => {
            // Normalize the content type config
            let normalizedCt: NormalizedContentType;

            // If it's a branded content type from defineContentType
            if ('__isContentTypeDefinition' in ct && ct.__isContentTypeDefinition) {
                const branded = ct as any;
                normalizedCt = {
                    name: branded.__definition.name,
                    displayName: branded.__definition.displayName,
                    description: branded.__definition.description,
                    schema: branded.__fields,
                };
            } else {
                normalizedCt = ct as any;
            }

            // Convert to content type definition for sync
            return schemaToContentType(
                normalizedCt.name,
                normalizedCt.schema,
                normalizedCt.displayName,
                normalizedCt.description
            );
        });

    // Sync with fields reference types enabled
    debug('Debug: content types to sync:', contentTypeDefs.map(ct => ct.name));
        const syncResult = await apiConfig.syncWithFields(
            contentTypeDefs,
            {
                dryRun: options.dryRun ?? false,
                createMissing: !options.dryRun,
                createMissingFields: !options.dryRun,
                updateFields: !options.dryRun,
            }
        );

        if (!syncResult || !syncResult.actions) {
            return {
                success: false,
                message: 'Sync returned no result',
            };
        }

        // Collect results from actions
        const created: string[] = [];
        const updated: string[] = [];
        const unchanged: string[] = [];
        const errors: Array<{ name: string; error: string }> = [];
        const mismatches: Array<{ name: string; detail: any }> = [];

        for (const action of syncResult.actions) {
            if (action.type === 'create') {
                created.push(action.contentType);
            } else if (action.type === 'create_fields' || action.type === 'update_fields') {
                if (!updated.includes(action.contentType)) {
                    updated.push(action.contentType);
                }
            } else if (action.type === 'skip' || action.type === 'noop') {
                if (!unchanged.includes(action.contentType)) {
                    unchanged.push(action.contentType);
                }
            } else if (action.type === 'mismatch') {
                // Capture mismatch details separately so dry-run verbose can show them
                mismatches.push({ name: action.contentType, detail: action.detail });
                errors.push({
                    name: action.contentType,
                    error: action.detail?.message || 'Schema mismatch',
                });
            }
        }

        const unchangedCount = unchanged.length;

        if (options.dryRun) {
            console.log('');
            console.log('🔍 Dry run - changes not applied');
            console.log(`Would create: ${created.length}`);
            console.log(`Would update: ${updated.length}`);
            console.log(`Unchanged: ${unchangedCount}`);
            if (options.verbose) {
                console.log('');
                if (created.length > 0) {
                    console.log('Created:');
                    created.forEach(c => console.log(`  + ${c}`));
                }
                if (updated.length > 0) {
                    console.log('Updated:');
                    updated.forEach(u => console.log(`  ~ ${u}`));
                }
                if (mismatches.length > 0) {
                    console.log('Mismatches (details):');
                    mismatches.forEach(m => {
                        console.log(`  - ${m.name}:`);
                        if (m.detail && m.detail.fieldDiffs) {
                            m.detail.fieldDiffs.forEach((fd: any) => {
                                console.log(`      * Field: ${fd.field} - Reason: ${fd.reason}`);
                                if (fd.desired) console.log(`        Desired: ${JSON.stringify(fd.desired)}`);
                                if (fd.existing) console.log(`        Existing: ${JSON.stringify(fd.existing)}`);
                                if (fd.changes) console.log(`        Changes: ${JSON.stringify(fd.changes)}`);
                            });
                        } else {
                            console.log(`      ${JSON.stringify(m.detail)}`);
                        }
                    });
                }
            }
        } else {
            console.log('');
            console.log('✅ Sync completed successfully');
            console.log(`Created: ${created.length}`);
            console.log(`Updated: ${updated.length}`);
            console.log(`Unchanged: ${unchangedCount}`);

            if (errors.length > 0) {
                console.log('');
                console.log('❌ Errors:');
                errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
            }
        }

        return {
            success: true,
            message: 'Schema sync completed',
            changes: {
                created,
                updated,
                unchanged: unchanged.map(u => u),
                errors,
            },
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Sync failed:', errorMessage);

        return {
            success: false,
            message: errorMessage,
        };
    }
}

/**
 * Preview what changes would be made without applying them
 */
export async function previewSync(
    config: DecoupiaConfig
): Promise<SyncResult> {
    return syncSchemas(config, { dryRun: true, verbose: true });
}

/**
 * Apply sync changes
 */
export async function applySync(config: DecoupiaConfig): Promise<SyncResult> {
    return syncSchemas(config, { autoApply: true });
}
