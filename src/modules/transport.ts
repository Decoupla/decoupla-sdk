export type ApiErrorDetail = { field?: string; message: string; [key: string]: unknown };

/** Structured errors shared by all SDK operations. Response bodies and tokens are not logged. */
export class ApiError extends Error {
    readonly status: number;
    readonly errors: ApiErrorDetail[];

    constructor(message: string, status = 0, errors: ApiErrorDetail[] = []) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }

    get isAuthorizationError(): boolean {
        return this.status === 401 || this.status === 403 ||
            this.errors.some(error => error.field === 'authorization');
    }
}

/** Read and validate the response within the request timeout, including its body. */
export async function apiFetch(url: string, options: RequestInit, timeoutMs = 30_000, fetchImpl: typeof fetch = globalThis.fetch) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error('requestTimeoutMs must be a positive safe integer');
    const controller = new AbortController();
    const callerSignal = options.signal;
    let timedOut = false;
    const callerAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) callerAbort();
    else callerSignal?.addEventListener('abort', callerAbort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const aborted = () => timedOut
        ? new ApiError(`API request timed out after ${timeoutMs}ms`)
        : new DOMException('Request aborted', 'AbortError');
    let abortListener: () => void = () => {};
    const cancellation = new Promise<never>((_, reject) => {
        abortListener = () => reject(aborted());
        controller.signal.addEventListener('abort', abortListener, { once: true });
    });
    try {
        if (controller.signal.aborted) throw aborted();
        const response = await Promise.race([fetchImpl(url, { ...options, signal: controller.signal }), cancellation]);
        let data: any;
        try {
            data = await Promise.race([response.json(), cancellation]);
        } catch (error) {
            if (controller.signal.aborted) throw aborted();
            throw new ApiError(`Invalid JSON response (HTTP ${response.status})`, response.status);
        }
        const errors: ApiErrorDetail[] = Array.isArray(data?.errors)
            ? data.errors.map((error: any) => ({ ...error, message: String(error?.message ?? 'Unknown API error') }))
            : [];
        if (!response.ok || errors.length || (data?.errors && !Array.isArray(data.errors))) {
            const details = errors.map(error => `${error.field ? `${error.field}: ` : ''}${error.message}`).join('; ');
            throw new ApiError(`API request failed (HTTP ${response.status})${details ? `: ${details}` : ''}`, response.status, errors);
        }
        if (!data || typeof data !== 'object' || !('data' in data)) {
            throw new ApiError(`Invalid API response (HTTP ${response.status}): missing data`, response.status);
        }
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
        const resultKey: Record<string, string> = {
            create_content_type: 'content_type', create_field: 'field', update_field: 'field',
        };
        const key = body && resultKey[body.op_type];
        if (key && typeof data.data?.[key]?.id !== 'string') {
            throw new ApiError(`Invalid API response (HTTP ${response.status}): missing ${key} ID`, response.status);
        }
        return { json: async () => data };
    } catch (error) {
        if (controller.signal.aborted) throw aborted();
        throw error;
    } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener('abort', callerAbort);
        controller.signal.removeEventListener('abort', abortListener);
    }
}

/** The read succeeded, but no entry was visible in the requested content view. */
export class EntryNotFoundError extends Error {
    constructor(readonly contentType: string, readonly entryId: string) {
        super(`Entry '${entryId}' was not found in content type '${contentType}'`);
        this.name = 'EntryNotFoundError';
    }
}

export type RequestOptions = {
    signal?: AbortSignal;
    requestTimeoutMs?: number;
};

export function requestUrl(config: { apiUrl?: string; workspace: string }, fallback: string): string {
    return `${(config.apiUrl || fallback).replace(/\/+$/, '')}/${encodeURIComponent(config.workspace)}`;
}
