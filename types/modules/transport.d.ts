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
export declare function apiFetch(url: string, options: RequestInit, timeoutMs?: number): Promise<{
    json: () => Promise<any>;
}>;
