// Clean, single implementation of the config loader.
import path from 'path';
import { existsSync } from 'fs';
import type { FieldDefinition, ContentTypeDefinition } from '../types/index';

export type SchemaDefinition = Record<string, FieldDefinition>;

export interface BrandedContentTypeConfig {
    __definition: ContentTypeDefinition;
    __fields: Record<string, FieldDefinition>;
    __isContentTypeDefinition: true;
}

export type ContentTypeConfig =
    | { name: string; displayName?: string; description?: string; schema: SchemaDefinition }
    | BrandedContentTypeConfig;

export interface DecoupiaConfig {
    apiToken: string;
    workspace: string;
    contentTypes: ContentTypeConfig[];
}

export function findConfigFile(startPath: string = process.cwd()): string | null {
    const configNames = ['decoupla.config.ts', 'decoupla.config.js'];
    for (const configName of configNames) {
        const configPath = path.join(startPath, configName);
        if (existsSync(configPath)) return configPath;
    }
    return null;
}

function toSnakeCase(input: string): string {
    if (!input) return input;
    return input
        // Insert underscore between lower-to-upper (camelCase -> snake_case)
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        // Replace spaces and hyphens with underscores
        .replace(/[\s-]+/g, '_')
        // Replace any non-alphanumeric/underscore with underscore
        .replace(/[^a-zA-Z0-9_]/g, '_')
        // Collapse multiple underscores
        .replace(/_+/g, '_')
        // Trim leading/trailing underscores
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
}

function normalizeContentType(ct: ContentTypeConfig) {
    if ('__isContentTypeDefinition' in ct && ct.__isContentTypeDefinition) {
        const branded = ct as BrandedContentTypeConfig;
        return { name: toSnakeCase(branded.__definition.name), displayName: branded.__definition.displayName, description: branded.__definition.description, schema: branded.__fields };
    }
    const raw = ct as { name: string; displayName?: string; description?: string; schema: SchemaDefinition };
    return { name: toSnakeCase(raw.name), displayName: raw.displayName, description: raw.description, schema: raw.schema };
}

export async function loadConfig(configPath: string): Promise<DecoupiaConfig> {
    if (!existsSync(configPath)) throw new Error(`Config file not found: ${configPath}`);
    const resolvedPath = path.resolve(configPath);
    let imported: any;
    try {
        imported = await import(`file://${resolvedPath}`);
    } catch (importErr) {
        if (/\.(ts|mts)$/.test(configPath)) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                // @ts-ignore
                const reg = require('esbuild-register/dist/node');
                if (reg && typeof reg.register === 'function') {
                    try {
                        reg.register({ extensions: ['.ts', '.mts', '.tsx', '.js'], tsconfig: path.join(process.cwd(), 'tsconfig.json') });
                    } catch (e) {
                        try { reg.register(); } catch (e2) { /* fallthrough */ }
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                imported = require(resolvedPath);
            } catch (regErr) {
                const msg = regErr && (regErr as any).message ? (regErr as any).message : String(regErr);
                throw new Error(`Failed to load TypeScript config: ${msg}\nInstall 'esbuild-register' or use an ESM .js config.`);
            }
        } else {
            throw importErr;
        }
    }

    const config = imported && (imported.default || imported);
    if (!config) throw new Error('Config file must export a default object or named export');
    if (!config.apiToken) throw new Error('Config must have apiToken');
    if (!config.workspace) throw new Error('Config must have workspace');
    if (!Array.isArray(config.contentTypes)) throw new Error('Config must have contentTypes array');

    const normalizedContentTypes: any[] = [];
    for (const ct of config.contentTypes) {
        const normalized = normalizeContentType(ct as ContentTypeConfig);
        if (!normalized.name) throw new Error('Each content type must have a name');
        if (!normalized.schema || typeof normalized.schema !== 'object') throw new Error(`Content type "${normalized.name}" must have a schema object`);
        normalizedContentTypes.push(normalized);
    }

    return { apiToken: config.apiToken, workspace: config.workspace, contentTypes: normalizedContentTypes } as DecoupiaConfig;
}

export function schemaToContentType(name: string, schema: SchemaDefinition, displayName?: string, description?: string): ContentTypeDefinition {
    return { name, displayName, description, fields: schema as Record<string, FieldDefinition> };
}

export async function loadConfigSafe(configPath?: string): Promise<{ config: DecoupiaConfig; path: string } | { error: string }> {
    try {
        const filePath = configPath || findConfigFile();
        if (!filePath) return { error: 'No config file found. Create decoupla.config.ts in your project root.' };
        const config = await loadConfig(filePath);
        return { config, path: filePath };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error loading config' };
    }
}
