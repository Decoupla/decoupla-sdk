/**
 * Schema synchronization CLI command
 *
 * Syncs local schema definitions with the remote backend.
 */
import type { DecoupiaConfig } from './config-loader';
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
        errors: Array<{
            name: string;
            error: string;
        }>;
    };
}
/**
 * Execute schema sync
 *
 * Fetches remote schemas and compares with local definitions,
 * then applies necessary changes (create/update).
 */
export declare function syncSchemas(config: DecoupiaConfig, options?: SyncOptions): Promise<SyncResult>;
/**
 * Preview what changes would be made without applying them
 */
export declare function previewSync(config: DecoupiaConfig): Promise<SyncResult>;
/**
 * Apply sync changes
 */
export declare function applySync(config: DecoupiaConfig): Promise<SyncResult>;
