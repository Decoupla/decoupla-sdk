import { test, expect } from 'bun:test';
import { createClient } from '../../src';
import { AuthorContentType, BlogPostContentType } from '../decoupla.config';

// This integration test uses the live API and requires DECOUPLA_API_TOKEN and DECOUPLA_WORKSPACE
const API_TOKEN = process.env.DECOUPLA_API_TOKEN || '';
const WORKSPACE = process.env.DECOUPLA_WORKSPACE || '';

const skip = !API_TOKEN || !WORKSPACE;

const client = createClient({ apiToken: API_TOKEN, workspace: WORKSPACE });

(skip ? test.skip : test)('create + update entry with preload returns preloaded relationships (client)', async () => {
    // 1) Create an Author (published)
    const authorData = {
        Name: `Preload Test Author ${Date.now()}`,
        Email: `preload-test-${Date.now()}@example.com`,
    };

    const authorResult = await client.createEntry(AuthorContentType, authorData, true);
    expect(authorResult).toBeDefined();
    const authorId = authorResult.id;
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

    const postResult = await client.createEntry(BlogPostContentType, postData, { published: true, preload: ['Author'] });
    expect(postResult).toBeDefined();
    console.log('postResult:', JSON.stringify(postResult, null, 2));
    // With preload, createEntry returns { data: { ...entry with preloaded fields } }
    expect(postResult.data).toBeDefined();
    expect(postResult.data.author).toBeDefined();
    expect(postResult.data.author!.id).toBe(authorId);

    // 3) Update the post with preload: ['Author'] and verify the returned entry contains the preloaded author
    const postId = postResult.data.id;
    const updateResult = await client.updateEntry(BlogPostContentType, postId, { Title: 'Preload Integration Test Post (updated)' }, { published: true, preload: ['Author'] });
    expect(updateResult).toBeDefined();
    console.log('updateResult:', JSON.stringify(updateResult, null, 2));
    // With preload, updateEntry returns { data: { ...entry with preloaded fields } }
    expect(updateResult.data).toBeDefined();
    expect(updateResult.data.author).toBeDefined();
    expect(updateResult.data.author!.id).toBe(authorId);
});
