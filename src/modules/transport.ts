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
export async function apiFetch(url: string, options: RequestInit, timeoutMs = 30_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        let data: any;
        try {
            data = await response.json();
        } catch {
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
        if (controller.signal.aborted) throw new ApiError(`API request timed out after ${timeoutMs}ms`);
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
