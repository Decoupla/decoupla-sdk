import type { BrandedContentType } from './generics';
import type { FieldAliases } from './writes';
import type { PreloadSpec } from './preload';
import type { RequestOptions } from '../modules/transport';
import type { VideoOptionsFor } from './videos';
import type { UpdateFieldValues } from './writes';
import type { ImageOptionsFor } from './images';
import type { TypeSafeFilters } from '../modules/filters';
type SortableKind = 'string' | 'slug' | 'int' | 'float' | 'boolean' | 'date' | 'time' | 'datetime';
export type SortField<CT extends BrandedContentType<any>> = 'id' | {
    [K in keyof CT['__fields'] & string]: CT['__fields'][K] extends {
        type: SortableKind;
    } ? FieldAliases<K> : never;
}[keyof CT['__fields'] & string];
export type SortSpec<CT extends BrandedContentType<any>> = ReadonlyArray<readonly [SortField<CT>, 'ASC' | 'DESC']>;
export type GetEntryOptions<CT extends BrandedContentType<any>, P extends PreloadSpec<CT> | undefined = undefined> = RequestOptions & {
    preload?: P;
    images?: ImageOptionsFor<CT>;
    videos?: VideoOptionsFor<CT>;
    contentView?: 'live' | 'preview';
};
export type GetEntriesOptions<CT extends BrandedContentType<any>, P extends PreloadSpec<CT> | undefined = undefined, RC extends boolean = false> = GetEntryOptions<CT, P> & {
    filters?: TypeSafeFilters<CT>;
    limit?: number;
    offset?: number;
    sort?: SortSpec<CT>;
    returnCount?: RC;
};
export type PaginationOptions<CT extends BrandedContentType<any>, P extends PreloadSpec<CT> | undefined = undefined> = Omit<GetEntriesOptions<CT, P>, 'limit' | 'returnCount'> & {
    /** Number of entries requested per page (default: 100). */
    pageSize?: number;
};
export type UpdateEntriesOptions<CT extends BrandedContentType<any>, P extends PreloadSpec<CT> | undefined = undefined> = Omit<GetEntriesOptions<CT, P>, 'images' | 'videos' | 'returnCount'> & {
    filters: TypeSafeFilters<CT>;
    values: UpdateFieldValues<CT>;
    published?: boolean;
};
export type UpdateEntriesResponse<Entry> = {
    data: Entry[];
    updatedCount: number;
    failedCount: number;
    errors: import('../modules/transport').ApiErrorDetail[][];
};
export {};
