/**
 * TypeScript type generation from schema definitions
 *
 * Generates TypeScript types from schema definitions so you can
 * use them without needing generics, or as type references.
 */
import type { SchemaDefinition } from './config-loader';
export interface NormalizedContentType {
    name: string;
    displayName?: string;
    description?: string;
    schema: SchemaDefinition;
}
/**
 * Generate TypeScript type definitions for a content type
 *
 * Generates three types:
 * - [Name]Input: For creating entries
 * - [Name]Update: For updating entries
 * - [Name]: For entry responses
 */
export declare function generateTypesForContentType(contentType: NormalizedContentType): string;
/**
 * Generate all type definitions for multiple content types
 */
export declare function generateAllTypes(contentTypes: NormalizedContentType[]): string;
/**
 * Generate index file that exports all types
 */
export declare function generateIndexFile(contentTypes: NormalizedContentType[]): string;
