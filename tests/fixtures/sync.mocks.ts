import type {
    EntryResponse,
    InspectResponse,
    EntriesResponse,
    FieldType,
    ContentTypeDefinition,
} from "../../src/types";

/**
 * Mock field object for testing
 */
export function createMockField(overrides?: Partial<InspectResponse['data']['content_types'][0]['fields'][0]>) {
    return {
        id: 'field-1',
        slug: 'field_name',
        type: 'string' as FieldType,
        is_label: false,
        required: false,
        ...overrides,
    };
}

/**
 * Mock content type from inspect response
 */
export function createMockRemoteContentType(
    id: string,
    fields: InspectResponse['data']['content_types'][0]['fields'] = []
) {
    return {
        id,
        fields,
    };
}

/**
 * Mock inspect response with content types
 */
export function createMockInspectResponse(
    contentTypes: Array<{
        id: string;
        fields: InspectResponse['data']['content_types'][0]['fields'];
    }> = []
): InspectResponse {
    return {
        data: {
            content_types: contentTypes.map(ct => ({
                id: ct.id,
                fields: ct.fields,
            })),
        },
    };
}

/**
 * Mock request function for testing sync operations
 */
export function createMockSyncRequest(inspectResponse: InspectResponse | null = null) {
    return async <T>(request: any): Promise<any> => {
        const { op_type } = request;

        if (op_type === 'inspect') {
            if (inspectResponse === null) {
                throw new Error('Inspect failed');
            }
            return inspectResponse;
        }

        throw new Error(`Unsupported operation: ${op_type}`);
    };
}

/**
 * Mock request with predefined content types
 */
export function createMockSyncRequestWithContentTypes(
    contentTypes: Array<{
        id: string;
        name: string;
        fields: Array<{
            id: string;
            slug: string;
            type: FieldType;
            is_label: boolean;
            required: boolean;
            meta?: {
                reference_types: string[];
            };
        }>;
    }>
) {
    const inspectResponse = createMockInspectResponse(contentTypes);
    return createMockSyncRequest(inspectResponse);
}

/**
 * Mock content type definition for testing
 */
export function createMockContentTypeDefinition(
    name: string,
    fields: Record<string, { type: FieldType; required?: boolean; isLabel?: boolean }> = {}
): ContentTypeDefinition {
    return {
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        fields,
    };
}

/**
 * Create a mock request that simulates successful content type creation
 */
export function createMockSyncRequestWithCreate(
    inspectResponse: InspectResponse,
    onCreateContentType?: (ct: ContentTypeDefinition) => Promise<any>
) {
    return async <T>(request: any): Promise<any> => {
        const { op_type } = request;

        if (op_type === 'inspect') {
            return inspectResponse;
        }

        if (op_type === 'create_content_type' && onCreateContentType) {
            return onCreateContentType(request.contentType);
        }

        throw new Error(`Unsupported operation: ${op_type}`);
    };
}

/**
 * Create a detailed mock inspect response for integration testing
 */
export function createDetailedMockInspectResponse() {
    return createMockInspectResponse([
        {
            id: 'article',
            fields: [
                {
                    id: 'field-title',
                    slug: 'title',
                    type: 'string',
                    is_label: true,
                    required: true,
                },
                {
                    id: 'field-content',
                    slug: 'content',
                    type: 'text',
                    is_label: false,
                    required: true,
                },
                {
                    id: 'field-published',
                    slug: 'published_at',
                    type: 'datetime',
                    is_label: false,
                    required: false,
                },
                {
                    id: 'field-cover',
                    slug: 'cover_image',
                    type: 'image',
                    is_label: false,
                    required: false,
                },
            ],
        },
        {
            id: 'author',
            fields: [
                {
                    id: 'field-name',
                    slug: 'name',
                    type: 'string',
                    is_label: true,
                    required: true,
                },
                {
                    id: 'field-email',
                    slug: 'email',
                    type: 'string',
                    is_label: false,
                    required: false,
                },
            ],
        },
    ]);
}

/**
 * Create a mock inspect response with reference fields
 */
export function createMockInspectResponseWithReferences() {
    return createMockInspectResponse([
        {
            id: 'article',
            fields: [
                {
                    id: 'field-title',
                    slug: 'title',
                    type: 'string',
                    is_label: true,
                    required: true,
                },
                {
                    id: 'field-author',
                    slug: 'author',
                    type: 'reference',
                    is_label: false,
                    required: true,
                    meta: {
                        reference_types: ['author-id'],
                    },
                },
                {
                    id: 'field-related',
                    slug: 'related_articles',
                    type: 'reference[]',
                    is_label: false,
                    required: false,
                    meta: {
                        reference_types: ['article-id'],
                    },
                },
            ],
        },
        {
            id: 'author',
            fields: [
                {
                    id: 'field-name',
                    slug: 'name',
                    type: 'string',
                    is_label: true,
                    required: true,
                },
            ],
        },
    ]);
}

/**
 * Create a mock scenario where remote and local are out of sync
 */
export function createMockSyncMismatchScenario() {
    const remoteInspect = createMockInspectResponse([
        {
            id: 'article',
            fields: [
                {
                    id: 'field-title',
                    slug: 'title',
                    type: 'string', // Local expects 'text'
                    is_label: true,
                    required: true,
                },
                {
                    id: 'field-status',
                    slug: 'status',
                    type: 'string',
                    is_label: false,
                    required: true, // Local expects false
                },
            ],
        },
    ]);

    const localDefinition = createMockContentTypeDefinition('article', {
        title: { type: 'text', required: true, isLabel: true }, // Mismatch: expect text
        status: { type: 'string', required: false }, // Mismatch: remote has true
        description: { type: 'text', required: false }, // Missing in remote
    });

    return {
        remoteInspect,
        localDefinition,
        expectedMismatches: {
            title: { reason: 'field_changes', change: 'type' },
            status: { reason: 'field_changes', change: 'required' },
            description: { reason: 'missing_field' },
        },
    };
}

/**
 * Create a mock request that tracks all calls made to it
 */
export function createTrackingMockSyncRequest(inspectResponse: InspectResponse) {
    const calls: Array<{ op_type: string; args?: any }> = [];

    const mockRequest = async <T>(request: any): Promise<any> => {
        calls.push({ op_type: request.op_type, args: request });

        if (request.op_type === 'inspect') {
            return inspectResponse;
        }

        throw new Error(`Unsupported operation: ${request.op_type}`);
    };

    return {
        mockRequest,
        calls,
        getInspectCalls: () => calls.filter(c => c.op_type === 'inspect'),
    };
}
