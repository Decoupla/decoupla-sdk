import { ApiError } from './transport';
import type { EntryPageInfo } from '../types';

export function validatePagination(options: { keyset?: boolean; offset?: number; after?: string; before?: string; limit?: number; countLimit?: number; returnCount?: boolean }) {
    if (options.keyset && options.offset !== undefined) throw new Error('keyset cannot be combined with offset');
    if ((options.after !== undefined || options.before !== undefined) && !options.keyset) throw new Error('cursors require keyset: true');
    if (options.after !== undefined && options.before !== undefined) throw new Error('Specify after or before, not both');
    for (const cursor of [options.after, options.before]) {
        if (cursor !== undefined && (typeof cursor !== 'string' || !cursor)) throw new Error('cursor must be a non-empty string');
    }
    if (options.keyset && options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 500)) throw new Error('Keyset limit must be between 1 and 500');
    if (options.countLimit !== undefined) {
        if (!options.returnCount) throw new Error('countLimit requires returnCount: true');
        if (!Number.isInteger(options.countLimit) || options.countLimit < 1 || options.countLimit > 1_000_000) throw new Error('countLimit must be between 1 and 1000000');
    }
}

export function readPageInfo(info: any): EntryPageInfo {
    if (!info || typeof info.has_previous_page !== 'boolean' || typeof info.has_next_page !== 'boolean' ||
        ![info.start_cursor, info.end_cursor].every(cursor => cursor === null || typeof cursor === 'string')) {
        throw new ApiError('Invalid pagination response: malformed page_info');
    }
    return { startCursor: info.start_cursor, endCursor: info.end_cursor,
        hasPreviousPage: info.has_previous_page, hasNextPage: info.has_next_page };
}
