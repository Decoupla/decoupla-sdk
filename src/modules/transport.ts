export type ApiErrorDetail = { field?: string; message: string; [key: string]: unknown };

/** Structured errors shared by all SDK operations. Response bodies and tokens are not logged. */
export class ApiError extends Error {
    readonly status: number;
    readonly errors: ApiErrorDetail[];
    /** For rate-limited requests, the seconds the API asked to wait before retrying. */
    readonly retryAfterSeconds?: number;

    constructor(message: string, status = 0, errors: ApiErrorDetail[] = [], retryAfterSeconds?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    get isAuthorizationError(): boolean {
        return this.status === 401 || this.status === 403 ||
            this.errors.some(error => error.field === 'authorization');
    }

    get isRateLimitError(): boolean {
        return this.status === 429;
    }
}

const MAX_RETRY_DELAY_MS = 60_000;

/** Seconds from a Retry-After header, given either as seconds or as an HTTP date. */
export function parseRetryAfter(header: string | null, now = Date.now()): number | undefined {
    if (!header) return undefined;
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds;
    const date = Date.parse(header);
    return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - now) / 1000));
}

function retryDelayMs(error: ApiError, attempt: number): number {
    if (error.retryAfterSeconds !== undefined) return Math.min(error.retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
    // Without a Retry-After, back off exponentially with jitter so parallel callers spread out.
    return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS) * (0.5 + Math.random() / 2);
}

function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
    return new Promise((resolve, reject) => {
        const aborted = () => new DOMException('Request aborted', 'AbortError');
        if (signal?.aborted) return reject(aborted());
        const onAbort = () => { clearTimeout(timer); reject(aborted()); };
        const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

/**
 * Sends an API request, retrying rate-limited (429) responses up to `maxRetries` times.
 * The API rejects a rate-limited request before running it, so retrying writes is safe.
 * The timeout applies to each attempt; waiting between attempts honors the caller's signal.
 */
export async function apiFetch(url: string, options: RequestInit, timeoutMs = 30_000, fetchImpl: typeof fetch = globalThis.fetch, maxRetries = 3) {
    if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error('maxRetries must be a non-negative safe integer');
    for (let attempt = 0; ; attempt++) {
        try {
            return await apiFetchOnce(url, options, timeoutMs, fetchImpl);
        } catch (error) {
            if (!(error instanceof ApiError) || !error.isRateLimitError || attempt >= maxRetries) throw error;
            await wait(retryDelayMs(error, attempt), options.signal);
        }
    }
}

/** Read and validate the response within the request timeout, including its body. */
async function apiFetchOnce(url: string, options: RequestInit, timeoutMs: number, fetchImpl: typeof fetch) {
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
            const details = errors.length
                ? errors.map(error => `${error.field ? `${error.field}: ` : ''}${error.message}`).join('; ')
                : typeof data?.message === 'string' ? data.message : '';
            const retryAfter = response.status === 429 ? parseRetryAfter(response.headers.get('retry-after')) : undefined;
            throw new ApiError(`API request failed (HTTP ${response.status})${details ? `: ${details}` : ''}`, response.status, errors, retryAfter);
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
    /** Retries for rate-limited (429) responses; overrides the client's `maxRetries`. */
    maxRetries?: number;
};

export function requestUrl(config: { apiUrl?: string; workspace: string }, fallback: string): string {
    return `${(config.apiUrl || fallback).replace(/\/+$/, '')}/${encodeURIComponent(config.workspace)}`;
}
