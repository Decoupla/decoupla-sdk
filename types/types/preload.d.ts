import type { BrandedContentType } from './generics';
import type { FieldDefinition } from './index';
type FieldKeys<CT extends BrandedContentType<any>> = keyof CT['__fields'] & string;
type RefFieldKeys<CT extends BrandedContentType<any>> = {
    [K in FieldKeys<CT>]: CT['__fields'][K & keyof CT['__fields']] extends {
        type: infer FT;
    } ? FT extends 'reference' | 'reference[]' ? K : never : never;
}[FieldKeys<CT>];
type FieldDefOf<CT extends BrandedContentType<any>, K extends FieldKeys<CT>> = CT['__fields'][K & keyof CT['__fields'] & string] & FieldDefinition;
type ReferencesForField<CT extends BrandedContentType<any>, K extends FieldKeys<CT>> = FieldDefOf<CT, K> extends {
    references: infer R;
} ? R : never;
type IsBranded<T> = T extends {
    __isContentTypeDefinition: true;
} ? T : never;
type BrandedFromRef<T> = T extends readonly (infer U)[] ? IsBranded<U> : IsBranded<T>;
export type PreloadSpec<CT extends BrandedContentType<any>> = Array<PreloadItem<CT>>;
export type PreloadItem<CT extends BrandedContentType<any>> = RefFieldKeys<CT> | [RefFieldKeys<CT>, InnerPreloadForField<CT, RefFieldKeys<CT>>];
type AnyPreload = any;
type IsStringRef<R> = [
    R
] extends [never] ? false : R extends string ? true : R extends readonly (infer U)[] ? (U extends string ? true : false) : false;
type InnerPreloadForField<CT extends BrandedContentType<any>, K extends RefFieldKeys<CT>> = FieldDefOf<CT, K> extends {
    type: infer FT;
} ? FT extends `reference${'' | '[]'}` ? (BrandedFromRef<ReferencesForField<CT, K>> extends never ? (IsStringRef<ReferencesForField<CT, K>> extends true ? AnyPreload : never) : ResolvePreloadForReferences<BrandedFromRef<ReferencesForField<CT, K>>>) : never : never;
type ResolvePreloadForReferences<T> = [
    T
] extends [never] ? AnyPreload : T extends BrandedContentType<any> ? PreloadSpec<T> | undefined : T extends readonly (infer U)[] ? (U extends BrandedContentType<any> ? PreloadSpec<U> : AnyPreload) | undefined : AnyPreload;
export {};
