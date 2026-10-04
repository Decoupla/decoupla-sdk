import type { BrandedContentType } from './generics';
import type { ImageTransform } from './images';
import type { FieldAliases } from './writes';

export type VideoTransform = { thumbnail?: ImageTransform };
export type VideoOptions = {
    [field: string]: VideoTransform | Record<string, VideoOptions> | undefined;
    references?: Record<string, VideoOptions>;
};
type Fields<CT> = CT extends BrandedContentType<any> ? CT['__fields'] : never;
type Keys<CT, Kind> = {
    [K in keyof Fields<CT> & string]: Fields<CT>[K] extends { type: Kind } ? K : never
}[keyof Fields<CT> & string];
type Targets<F> = F extends { references: infer R } ? R extends readonly (infer T)[] ? T : R : never;
type Options<T> = [T] extends [never] ? VideoOptions : T extends BrandedContentType<any> ? VideoOptionsFor<T> : VideoOptions;
export type VideoOptionsFor<CT extends BrandedContentType<any>> = {
    [K in Keys<CT, 'video' | 'video[]'> as FieldAliases<K>]?: VideoTransform;
} & {
    references?: { [K in Keys<CT, 'reference' | 'reference[]'> as FieldAliases<K>]?: Options<Targets<Fields<CT>[K]>> };
};
