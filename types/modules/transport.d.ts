export type ApiErrorDetail = {
    field?: string;
    message: string;
    [key: string]: unknown;
};
/** Structured errors shared by all SDK operations. Response bodies and tokens are not logged. */
export declare class ApiError extends Error {
    readonly status: number;
    readonly errors: ApiErrorDetail[];
    /** For rate-limited requests, the seconds the API asked to wait before retrying. */
    readonly retryAfterSeconds?: number;
    constructor(message: string, status?: number, errors?: ApiErrorDetail[], retryAfterSeconds?: number);
    get isAuthorizationError(): boolean;
    get isRateLimitError(): boolean;
}
/** Seconds from a Retry-After header, given either as seconds or as an HTTP date. */
export declare function parseRetryAfter(header: string | null, now?: number): number | undefined;
/**
 * Sends an API request, retrying rate-limited (429) responses up to `maxRetries` times.
 * The API rejects a rate-limited request before running it, so retrying writes is safe.
 * The timeout applies to each attempt; waiting between attempts honors the caller's signal.
 */
export declare function apiFetch(url: string, options: RequestInit, timeoutMs?: number, fetchImpl?: typeof fetch, maxRetries?: number): Promise<Response | {
    json: () => Promise<any>;
}>;
/** Raw storage responses have empty success bodies and XML errors. Never adds API credentials or retries a PUT. */
export declare function storageFetch(url: string, options: RequestInit, timeoutMs?: number, fetchImpl?: typeof fetch): Promise<Response>;
/** The read succeeded, but no entry was visible in the requested content view. */
export declare class EntryNotFoundError extends Error {
    readonly contentType: string;
    readonly entryId: string;
    constructor(contentType: string, entryId: string);
}
export type RequestOptions = {
    signal?: AbortSignal;
    requestTimeoutMs?: number;
    /** Retries for rate-limited (429) responses; overrides the client's `maxRetries`. */
    maxRetries?: number;
};
export declare function requestUrl(config: {
    apiUrl?: string;
    workspace: string;
}, fallback: string): string;
