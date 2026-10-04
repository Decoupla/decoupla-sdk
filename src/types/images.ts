import type { BrandedContentType } from './generics';

export type ImageFormat = 'jpg' | 'png' | 'webp' | 'avif';

/** One dimension preserves aspect ratio; two dimensions resize and center-crop. */
export type ImageTransform = {
    width?: number;
    height?: number;
    format?: ImageFormat;
};

/** Runtime tree, also used when reference targets are declared by name. */
export type ImageOptions = {
    [field: string]: ImageTransform | Record<string, ImageOptions> | undefined;
    references?: Record<string, ImageOptions>;
};

type Fields<CT> = CT extends BrandedContentType<any> ? CT['__fields'] : never;
type KeysOfType<CT, Kind> = {
    [K in keyof Fields<CT> & string]: Fields<CT>[K] extends { type: Kind } ? K : never
}[keyof Fields<CT> & string];
type FieldAliases<K extends string> = K | Uncapitalize<K>;
type Target<F> = F extends { references: infer R }
    ? R extends readonly (infer U)[] ? U : R
    : never;
type TargetOptions<T> = [T] extends [never] ? ImageOptions
    : T extends BrandedContentType<any> ? ImageOptionsFor<T> : ImageOptions;

/** Image and reference field names are checked against branded content types. */
export type ImageOptionsFor<CT extends BrandedContentType<any>> = {
    [K in KeysOfType<CT, 'image' | 'image[]'> as FieldAliases<K>]?: ImageTransform;
} & {
    references?: {
        [K in KeysOfType<CT, 'reference' | 'reference[]'> as FieldAliases<K>]?: TargetOptions<Target<Fields<CT>[K]>>;
    };
};
