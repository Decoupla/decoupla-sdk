import type { FieldDefinition, ContentTypeDefinition } from '../types/index';
export type SchemaDefinition = Record<string, FieldDefinition>;
export interface BrandedContentTypeConfig {
    __definition: ContentTypeDefinition;
    __fields: Record<string, FieldDefinition>;
    __isContentTypeDefinition: true;
}
export type ContentTypeConfig = {
    name: string;
    displayName?: string;
    description?: string;
    schema: SchemaDefinition;
} | BrandedContentTypeConfig;
export interface DecoupiaConfig {
    apiToken: string;
    workspace: string;
    contentTypes: ContentTypeConfig[];
}
export declare function findConfigFile(startPath?: string): string | null;
export declare function loadConfig(configPath: string): Promise<DecoupiaConfig>;
export declare function schemaToContentType(name: string, schema: SchemaDefinition, displayName?: string, description?: string): ContentTypeDefinition;
export declare function loadConfigSafe(configPath?: string): Promise<{
    config: DecoupiaConfig;
    path: string;
} | {
    error: string;
}>;
