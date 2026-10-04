import { afterEach, describe, expect, test } from 'bun:test';
import { createClient, defineContentType, ApiError } from '../../src';
import { normalizeImages } from '../../src/modules/images';

const fetchBefore = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchBefore; });
const Author = defineContentType({ name: 'author', fields: {
    Avatar: { type: 'image' }, PhotoGallery: { type: 'image[]' },
} });
const Post = defineContentType({ name: 'post', fields: {
    FeaturedImage: { type: 'image' }, Authors: { type: 'reference[]', references: [Author] },
    RelatedPosts: { type: 'reference[]', references: ['post'] },
} });
const image = { id: 'image', width: 1600, height: 900, format: 'jpg', byte_size: 30000,
    output: { url: 'https://images.example/variant.webp', width: 400, height: 225, format: 'webp', byte_size: 3000 } };
const entry = { id: 'post', featured_image: image,
    authors: [{ id: 'author', avatar: image, photo_gallery: [image] }],
    related_posts: [{ id: 'related', featured_image: image, authors: [{ id: 'author', photo_gallery: [image] }] }],
    json_data: { untouched_key: true } };
const options = {
    preload: ['Authors', ['RelatedPosts', ['Authors']]] as any,
    images: { featuredImage: { width: 800, format: 'webp' as const }, references: {
        authors: { avatar: { width: 80, height: 80, format: 'webp' as const } },
        relatedPosts: { featuredImage: { width: 400 }, references: {
            authors: { photoGallery: { height: 40 } },
        } },
    } },
};

describe('image transformations on entry reads', () => {
    for (const operation of ['get_entry', 'get_entries'] as const) {
        test(`${operation} sends nested options and normalizes preloaded fields`, async () => {
            const requests: any[] = [];
            globalThis.fetch = (async (_url: any, request: any) => {
                const body = JSON.parse(request.body); requests.push(body);
                const data = body.op_type === 'inspect' ? { content_types: [] }
                    : operation === 'get_entry' ? { entry } : { entries: [entry], count: 1 };
                return new Response(JSON.stringify({ data }), { status: 200 });
            }) as typeof fetch;
            const client = createClient({ apiToken: 'test', workspace: 'test' });
            const response = operation === 'get_entry'
                ? await client.getEntry(Post, 'post', options)
                : await client.getEntries(Post, { ...options, returnCount: true });
            const body = requests.find(body => body.op_type === operation);
            expect(body.images).toEqual({ featured_image: { width: 800, format: 'webp' }, references: {
                authors: { avatar: { width: 80, height: 80, format: 'webp' } },
                related_posts: { featured_image: { width: 400 }, references: {
                    authors: { photo_gallery: { height: 40 } },
                } },
            } });
            expect(body.preload).toEqual(['authors', ['related_posts', ['authors']]]);
            const result: any = operation === 'get_entry' ? response.data : (response.data as any)[0];
            expect(result.featuredImage.output.width).toBe(400);
            expect(result.authors[0].photoGallery[0]).toEqual(image);
            expect(result.relatedPosts[0].authors[0].photoGallery[0]).toEqual(image);
            expect(result.jsonData).toEqual({ untouched_key: true });
            if (operation === 'get_entries') expect((response as any).count).toBe(1);
        });
    }

    test('omits image options for existing reads', async () => {
        globalThis.fetch = (async (_url: any, request: any) => {
            expect(JSON.parse(request.body).images).toBeUndefined();
            return new Response(JSON.stringify({ data: { entry: {} } }));
        }) as typeof fetch;
        await createClient({ apiToken: 'test', workspace: 'test' }).getEntry(Post, 'post');
    });

    test('validates options before sending a read request', async () => {
        globalThis.fetch = (() => { throw new Error('Must not send request'); }) as typeof fetch;
        const client = createClient({ apiToken: 'test', workspace: 'test' });
        await expect(client.getEntry(Post, 'post', { images: { featuredImage: { width: 0 } } })).rejects.toThrow();
        for (const bad of [null, [], { photo: { quality: 80 } }, { photo: { format: 'svg' } },
            { photo: { width: 8193 } }, { photo: { width: 8192, height: 8192 } },
            { references: { author: null } }, { Photo: {}, photo: {} }]) {
            expect(() => normalizeImages(bad)).toThrow();
        }
    });

    test('preserves structured backend validation errors', async () => {
        globalThis.fetch = (async () => new Response(JSON.stringify({ errors: [{
            field: 'images.references.authors', message: 'Reference must be included in preload',
        }] }), { status: 400 })) as typeof fetch;
        try {
            await createClient({ apiToken: 'test', workspace: 'test' }).getEntry(Post, 'post', {
                images: { references: { authors: { avatar: { width: 80 } } } },
            });
            throw new Error('Expected failure');
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).errors[0].field).toBe('images.references.authors');
        }
    });
});
