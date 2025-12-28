/**
 * TypeScript type generation from schema definitions
 * 
 * Generates TypeScript types from schema definitions so you can
 * use them without needing generics, or as type references.
 */

import type { SchemaDefinition } from './config-loader';
import type { FieldType, FieldDefinition } from '../types/index';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface NormalizedContentType {
    name: string;
    displayName?: string;
    description?: string;
    schema: SchemaDefinition;
}

// ============================================
// TYPE GENERATION
// ============================================

/**
 * Map field type to TypeScript type string
 */
function fieldTypeToTsType(fieldType: FieldType, isArray: boolean = false): string {
    let baseType: string;

    switch (fieldType) {
        case 'string':
        case 'text':
        case 'slug':
            baseType = 'string';
            break;
        case 'int':
            baseType = 'number';
            break;
        case 'float':
            baseType = 'number';
            break;
        case 'boolean':
            baseType = 'boolean';
            break;
        case 'date':
        case 'datetime':
        case 'time':
            baseType = 'string'; // ISO 8601
            break;
        case 'reference':
            baseType = 'string'; // ID
            break;
        case 'image':
            baseType = 'any'; // ImageObject
            break;
        case 'video':
            baseType = 'string';
            break;
        case 'json':
            baseType = 'Record<string, any>';
            break;
        case 'string[]':
            baseType = 'string[]';
            break;
        case 'reference[]':
            baseType = 'string[]';
            break;
        case 'image[]':
            baseType = 'any[]';
            break;
        case 'video[]':
            baseType = 'string[]';
            break;
        default:
            baseType = 'any';
    }

    return isArray && !baseType.endsWith('[]') ? `${baseType}[]` : baseType;
}

/**
 * Generate TypeScript type definitions for a content type
 * 
 * Generates three types:
 * - [Name]Input: For creating entries
 * - [Name]Update: For updating entries
 * - [Name]: For entry responses
 */
export function generateTypesForContentType(
    contentType: NormalizedContentType
): string {
    const { name, schema } = contentType;

    // Convert snake_case name to PascalCase for type names
    const typeName = name
        .split('_')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

    const lines: string[] = [];

    // ============================================
    // INPUT TYPE (for createEntry)
    // ============================================
    lines.push(`/**`);
    lines.push(` * Input type for creating ${name} entries`);
    lines.push(` */`);
    lines.push(`export type ${typeName}Input = {`);

    // Required fields first
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
        const fd = fieldDef as FieldDefinition;
        if (fd.required) {
            const tsType = fieldTypeToTsType(fd.type);
            lines.push(`    /** ${fieldName} */`);
            lines.push(`    ${fieldName}: ${tsType};`);
        }
    }

    // Optional fields
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
        const fd = fieldDef as FieldDefinition;
        if (!fd.required) {
            const tsType = fieldTypeToTsType(fd.type);
            lines.push(`    /** ${fieldName} */`);
            lines.push(`    ${fieldName}?: ${tsType};`);
        }
    }

    lines.push(`};`);
    lines.push(``);

    // ============================================
    // UPDATE TYPE (for updateEntry)
    // ============================================
    lines.push(`/**`);
    lines.push(` * Update type for updating ${name} entries`);
    lines.push(` * All fields are optional for partial updates`);
    lines.push(` */`);
    lines.push(`export type ${typeName}Update = {`);

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
        const fd = fieldDef as FieldDefinition;
        const tsType = fieldTypeToTsType(fd.type);
        lines.push(`    /** ${fieldName} */`);
        lines.push(`    ${fieldName}?: ${tsType};`);
    }

    lines.push(`};`);
    lines.push(``);

    // ============================================
    // ENTRY TYPE (for getEntry / getEntries)
    // ============================================
    lines.push(`/**`);
    lines.push(` * Entry type for ${name} responses`);
    lines.push(` * Includes the id field added by the API`);
    lines.push(` */`);
    lines.push(`export type ${typeName} = {`);
    lines.push(`    /** Unique identifier (auto-generated) */`);
    lines.push(`    id: string;`);

    // Required fields
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
        const fd = fieldDef as FieldDefinition;
        if (fd.required) {
            const tsType = fieldTypeToTsType(fd.type);
            lines.push(`    /** ${fieldName} */`);
            lines.push(`    ${fieldName}: ${tsType};`);
        }
    }

    // Optional fields
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
        const fd = fieldDef as FieldDefinition;
        if (!fd.required) {
            const tsType = fieldTypeToTsType(fd.type);
            lines.push(`    /** ${fieldName} */`);
            lines.push(`    ${fieldName}?: ${tsType};`);
        }
    }

    lines.push(`};`);

    return lines.join('\n');
}

/**
 * Generate all type definitions for multiple content types
 */
export function generateAllTypes(contentTypes: NormalizedContentType[]): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * Auto-generated TypeScript type definitions from decoupla.config.ts`);
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(` * `);
    lines.push(` * DO NOT EDIT MANUALLY - Run 'decoupla generate' to update`);
    lines.push(` */`);
    lines.push(``);

    for (const contentType of contentTypes) {
        lines.push(generateTypesForContentType(contentType));
        lines.push(``);
    }

    return lines.join('\n');
}

/**
 * Generate index file that exports all types
 */
export function generateIndexFile(contentTypes: NormalizedContentType[]): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * Auto-generated type exports`);
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(` */`);
    lines.push(``);

    for (const contentType of contentTypes) {
        const typeName = contentType.name
            .split('_')
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

        lines.push(`export type { ${typeName}Input, ${typeName}Update, ${typeName} } from './generated-types';`);
    }

    return lines.join('\n');
}
