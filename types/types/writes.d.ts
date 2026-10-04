import type { BrandedContentType } from './generics';
export type SnakeCase<S extends string> = S extends `${infer Head}${infer Tail}` ? `${Head extends Lowercase<Head> ? Head : `_${Lowercase<Head>}`}${SnakeCase<Tail>}` : S;
export type FieldAliases<K extends string> = K | Uncapitalize<K> | SnakeCase<Uncapitalize<K>>;
export type JsonValue = null | string | number | boolean | JsonValue[] | {
    [key: string]: JsonValue;
};
export type EntryIdInput = string | {
    id: string;
};
type StringInput<F> = F extends {
    options: readonly [];
} ? string | number | boolean : F extends {
    options: readonly (infer Option extends string)[];
} ? Option : string | number | boolean;
type ScalarInput<Kind, F> = Kind extends 'string' ? StringInput<F> : Kind extends 'text' | 'slug' ? string | number | boolean : Kind extends 'int' | 'float' ? number | string : Kind extends 'boolean' ? boolean | 'true' | 'false' | 0 | 1 : Kind extends 'date' | 'time' | 'datetime' ? string | Date : Kind extends 'image' | 'video' | 'reference' ? EntryIdInput : Kind extends 'json' ? JsonValue : never;
export type FieldWriteValue<F> = F extends {
    type: infer Kind;
} ? Kind extends `${infer Base}[]` ? ScalarInput<Base, F>[] : ScalarInput<Kind, F> : never;
type Fields<CT extends BrandedContentType<any>> = CT['__fields'];
type OptionalFields<F> = {
    [K in keyof F & string as FieldAliases<K>]?: FieldWriteValue<F[K]> | (F[K] extends {
        required: true;
    } ? never : null);
};
type RequireAlias<K extends string, V> = {
    [Alias in FieldAliases<K>]: {
        [A in Alias]: V;
    };
}[FieldAliases<K>];
type RequiredFields<F> = {
    [K in keyof F & string]: (value: F[K] extends {
        required: true;
    } ? RequireAlias<K, FieldWriteValue<F[K]>> : {}) => void;
}[keyof F & string] extends (value: infer Required) => void ? Required : {};
/** Creates require every required field, under any supported field-name spelling. */
export type CreateFieldValues<CT extends BrandedContentType<any>> = OptionalFields<Fields<CT>> & RequiredFields<Fields<CT>>;
/** Updates are partial; optional fields may be cleared with null. */
export type UpdateFieldValues<CT extends BrandedContentType<any>> = OptionalFields<Fields<CT>>;
export {};
