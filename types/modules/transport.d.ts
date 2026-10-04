export type ApiErrorDetail = {
    field?: string;
    message: string;
    [key: string]: unknown;
};
/** Structured errors shared by all SDK operations. Response bodies and tokens are not logged. */
export declare class ApiError extends Error {
    readonly status: number;
    readonly errors: ApiErrorDetail[];
    constructor(message: string, status?: number, errors?: ApiErrorDetail[]);
    get isAuthorizationError(): boolean;
}
/** Read and validate the response within the request timeout, including its body. */
export declare function apiFetch(url: string, options: RequestInit, timeoutMs?: number, fetchImpl?: typeof fetch): Promise<{
    json: () => Promise<any>;
}>;
/** The read succeeded, but no entry was visible in the requested content view. */
export declare class EntryNotFoundError extends Error {
    readonly contentType: string;
    readonly entryId: string;
    constructor(contentType: string, entryId: string);
}
export type RequestOptions = {
    signal?: AbortSignal;
    requestTimeoutMs?: number;
};
export declare function requestUrl(config: {
    apiUrl?: string;
    workspace: string;
}, fallback: string): string;
