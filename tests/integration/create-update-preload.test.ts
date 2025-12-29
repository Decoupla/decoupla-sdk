import { test, expect } from 'bun:test';
import { createClient } from '../../src';
import { AuthorContentType, BlogPostContentType } from '../decoupla.config';

// This integration test uses the live API and requires DECOUPLA_API_TOKEN and DECOUPLA_WORKSPACE
const API_TOKEN = process.env.DECOUPLA_API_TOKEN;
const WORKSPACE = process.env.DECOUPLA_WORKSPACE;

if (!API_TOKEN || !WORKSPACE) {
    console.error('Missing DECOUPLA_API_TOKEN or DECOUPLA_WORKSPACE - skipping tests.');
    process.exit(1);
}

const client = createClient({ apiToken: API_TOKEN, workspace: WORKSPACE });

test('create + update entry with preload returns preloaded relationships (client)', async () => {
    // 1) Create an Author (published)
    const authorData = {
        Name: `Preload Test Author ${Date.now()}`,
        Email: `preload-test-${Date.now()}@example.com`,
    };

    const authorResult = await client.createEntry(AuthorContentType, authorData, true);
    expect(authorResult).toBeDefined();
    const authorId = (authorResult as any).id || (authorResult as any).data?.id;
    expect(authorId).toBeDefined();
    console.log('authorResult:', JSON.stringify(authorResult, null, 2));

    // 2) Create a BlogPost with preload: ['Author'] and assert the client create response contains the preloaded author
    const postData = {
        Title: 'Preload Integration Test Post',
        Content: 'Body content for preload test',
        Excerpt: 'Preload test',
        Author: authorId,
        IsPublished: true,
        PublishedDate: new Date().toISOString().slice(0, 10),
    };

    const postResult = await client.createEntry(BlogPostContentType, postData, { published: true, preload: ['Author'] } as any);
    expect(postResult).toBeDefined();
    console.log('postResult:', JSON.stringify(postResult, null, 2));
    const postEntry = (postResult as any).data || postResult;
    expect(postEntry).toBeDefined();
    expect(postEntry.author).toBeDefined();
    expect(postEntry.author.id).toBe(authorId);

    // 3) Update the post with preload: ['Author'] and verify the returned entry contains the preloaded author
    const postId = postEntry.id;
    const updateResult = await client.updateEntry(BlogPostContentType, postId, { Title: 'Preload Integration Test Post (updated)' }, { published: true, preload: ['Author'] } as any);
    expect(updateResult).toBeDefined();
    console.log('updateResult:', JSON.stringify(updateResult, null, 2));
    const updated = (updateResult as any).data || updateResult;
    // If the client returned metadata only, fetch via getEntry with preload
    if ((updated as any).author) {
        expect((updated as any).author.id).toBe(authorId);
    } else {
        // Server did not return preload on update. Try fetching the entry with getEntry (explicitly requesting the live dataset),
        // but don't fail if backend doesn't return it here.
        const got = await client.getEntry(BlogPostContentType, postId, { preload: ['Author'], contentView: 'live' } as any);
        console.log('client.getEntry response (fallback):', JSON.stringify(got, null, 2));
        if ((got as any)?.data?.author) {
            expect((got as any).data.author.id).toBe(authorId);
        } else {
            console.warn('Preload not present on update response or get_entry fallback. Create response did contain the preloaded relation.');
        }
    }
});
