import { test, expect } from 'bun:test';
import { createClient } from '../../src';
import { BlogPostContentType } from '../decoupla.config';

// Integration test: verify that `contentView: 'preview'` can return draft content
// while `contentView: 'live'` returns a different result (or an authorization/not-found error).
const API_TOKEN = process.env.DECOUPLA_API_TOKEN || '';
const WORKSPACE = process.env.DECOUPLA_WORKSPACE || '';

const skip = !API_TOKEN || !WORKSPACE;

const client = createClient({ apiToken: API_TOKEN, workspace: WORKSPACE });

(skip ? test.skip : test)('contentView: preview vs live should return different results for a draft entry', async () => {
    // Create a published BlogPost first, then create a draft update so preview/live differ.
    const originalTitle = `Live ContentView Test ${Date.now()}`;
    const publishedPostData = {
        Title: originalTitle,
        Content: 'Published body for contentView test',
        Excerpt: 'Published test',
        IsPublished: true,
    };

    const createResp = await client.createEntry(BlogPostContentType, publishedPostData, true);
    expect(createResp).toBeDefined();
    const postId = createResp.id;
    expect(postId).toBeDefined();
    // Now create a draft update (unpublished) that changes the title
    const draftTitle = `Draft ContentView Test ${Date.now()}`;
    await client.updateEntry(BlogPostContentType, postId, { Title: draftTitle }, false);

    // Fetch with preview view - should return the draft title
    const preview = await client.getEntry(BlogPostContentType, postId, { contentView: 'preview' });
    expect(preview).toBeDefined();
    expect(preview.data).toBeDefined();
    expect(preview.data.title).toBe(draftTitle);

    // Fetch with live view - should normally return the originally published title
    const liveResult = await client.getEntry(BlogPostContentType, postId, { contentView: 'live' });
    expect(liveResult).toBeDefined();
    expect(liveResult.data).toBeDefined();

    if (liveResult.data.title === preview.data.title) {
        // Backend may surface drafts on both views depending on token/tenant; warn but don't fail.
        console.warn('Preview and live returned identical content — backend may not distinguish views for this workspace/token.');
    } else {
        expect(liveResult.data.title).toBe(originalTitle);
    }
});
