import { z } from "zod";
import type { ImageObject, TextObject } from "../types";
export declare function snakeToCamel(str: string): string;
export declare function camelToSnake(str: string): string;
export declare const initSchema: z.ZodObject<{
    apiToken: z.ZodString;
    workspace: z.ZodString;
}, z.core.$strip>;
export type InitSchema = z.infer<typeof initSchema>;
export declare const requestSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    op_type: z.ZodEnum<{
        get_entry: "get_entry";
        get_entries: "get_entries";
        inspect: "inspect";
    }>;
    api_type: z.ZodOptional<z.ZodEnum<{
        live: "live";
        preview: "preview";
    }>>;
    entry_id: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodAny>;
    preload: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    sort: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodEnum<{
        ASC: "ASC";
        DESC: "DESC";
    }>], null>>>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type RequestSchema = z.infer<typeof requestSchema>;
export type FieldSchemaConfig = {
    type: 'string';
    required?: boolean;
    options?: readonly string[];
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'string[]';
    required?: boolean;
    options?: readonly string[];
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'text';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'slug';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'int';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'int[]';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'float';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'float[]';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'boolean';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'boolean[]';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'date';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'time';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'datetime';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'json';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'image';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'image[]';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'video';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'video[]';
    required?: boolean;
    isLabel?: boolean;
    schema?: z.ZodTypeAny;
} | {
    type: 'reference';
    required?: boolean;
    isLabel?: boolean;
    references?: readonly (string | Record<string, FieldSchemaConfig> | {
        __fields: Record<string, FieldSchemaConfig>;
    })[];
    schema?: z.ZodTypeAny;
} | {
    type: 'reference[]';
    required?: boolean;
    isLabel?: boolean;
    references?: readonly (string | Record<string, FieldSchemaConfig> | {
        __fields: Record<string, FieldSchemaConfig>;
    })[];
    schema?: z.ZodTypeAny;
};
export type FieldType = FieldSchemaConfig extends {
    type: infer T;
} ? T : never;
type InferFieldType<T extends FieldSchemaConfig> = T extends {
    type: 'string';
    options: readonly (infer Opt)[];
} ? Opt : T extends {
    type: 'string';
} ? string : T extends {
    type: 'string[]';
    options: readonly (infer Opt)[];
} ? Opt[] : T extends {
    type: 'string[]';
} ? string[] : T extends {
    type: 'text';
} ? TextObject : T extends {
    type: 'slug';
} ? string : T extends {
    type: 'int';
} ? number : T extends {
    type: 'int[]';
} ? number[] : T extends {
    type: 'float';
} ? number : T extends {
    type: 'float[]';
} ? number[] : T extends {
    type: 'boolean';
} ? boolean : T extends {
    type: 'boolean[]';
} ? boolean[] : T extends {
    type: 'date';
} ? string : T extends {
    type: 'time';
} ? string : T extends {
    type: 'datetime';
} ? string : T extends {
    type: 'json';
} ? unknown : T extends {
    type: 'image';
} ? ImageObject : T extends {
    type: 'image[]';
} ? ImageObject[] : T extends {
    type: 'video';
} ? string : T extends {
    type: 'video[]';
} ? string[] : T extends {
    type: 'reference';
    references: readonly (infer Ref)[];
} ? Ref extends string ? string | Record<string, any> : Ref extends {
    __fields: infer Fields;
} ? Fields extends Record<string, FieldSchemaConfig> ? Omit<ContentTypeFromConfig<Fields>, never> : string | Record<string, any> : Ref extends Record<string, FieldSchemaConfig> ? Omit<ContentTypeFromConfig<Ref>, never> : string | Record<string, any> : T extends {
    type: 'reference[]';
    references: readonly (infer Ref)[];
} ? Ref extends string ? (string | Record<string, any>)[] : Ref extends {
    __fields: infer Fields;
} ? Fields extends Record<string, FieldSchemaConfig> ? Omit<ContentTypeFromConfig<Fields>, never>[] : (string | Record<string, any>)[] : Ref extends Record<string, FieldSchemaConfig> ? Omit<ContentTypeFromConfig<Ref>, never>[] : (string | Record<string, any>)[] : never;
type IsRequired<T extends FieldSchemaConfig> = T extends {
    required: true;
} ? true : false;
type TransformField<T extends FieldSchemaConfig> = IsRequired<T> extends true ? InferFieldType<T> : InferFieldType<T> | undefined;
export type ContentTypeFromConfig<T extends Record<string, FieldSchemaConfig>> = {
    [K in keyof T]: TransformField<T[K]>;
};
export type ExtractFields<T> = T extends {
    __fields: infer F;
} ? F : never;
export type InferContentType<T extends {
    __fields: Record<string, FieldSchemaConfig>;
}> = Omit<ContentTypeFromConfig<T['__fields']>, never>;
export type ContentTypeSchemaConfig = {
    fields: Record<string, FieldSchemaConfig>;
};
/**
 * Helper function to build a Zod schema for a field based on its config.
 * If a custom schema is provided, it uses that; otherwise, infers from the type.
 */
export declare const fieldSchemaBuilder: (config: FieldSchemaConfig) => z.ZodTypeAny;
/**
 * Build a Zod object schema from a content type config with proper type preservation.
 *
 * Usage:
 *   type Author = Omit<ContentTypeFromConfig<typeof authorConfig>, never>;
 *   type Article = Omit<ContentTypeFromConfig<typeof articleConfig>, never>;
 *
 *   const authorSchema = createContentTypeSchema({ fields: authorConfig });
 *   const articleSchema = createContentTypeSchema({ fields: articleConfig });
 */
export declare const createContentTypeSchema: <T extends Record<string, FieldSchemaConfig>>(config: {
    fields: T;
}) => z.ZodType<ContentTypeFromConfig<T>>;
export {};
