import type { EntryPageInfo } from '../types';
export declare function validatePagination(options: {
    keyset?: boolean;
    offset?: number;
    after?: string;
    before?: string;
    limit?: number;
    countLimit?: number;
    returnCount?: boolean;
}): void;
export declare function readPageInfo(info: any): EntryPageInfo;
