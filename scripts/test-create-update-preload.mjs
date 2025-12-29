#!/usr/bin/env bun
// Test script: create + update entry with preload against live backend
// Usage: bun scripts/test-create-update-preload.mjs

const {
  DECOUPLA_API_TOKEN,
  DECOUPLA_WORKSPACE,
  DECOUPLA_API_URL_BASE = 'https://api.decoupla.com/public/api/1.0/workspace/'
} = process.env;

if (!DECOUPLA_API_TOKEN || !DECOUPLA_WORKSPACE) {
  console.error('Missing DECOUPLA_API_TOKEN or DECOUPLA_WORKSPACE in environment');
  process.exit(1);
}

const apiBase = `${DECOUPLA_API_URL_BASE}${DECOUPLA_WORKSPACE}`;

const makeReq = async (body) => {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DECOUPLA_API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch (e) {
    return { raw: txt, status: res.status };
  }
};

const run = async () => {
  console.log('Creating an Author (published)...');
  const authorBody = {
    op_type: 'create_entry',
    type: 'author',
    field_values: {
      Name: 'Preload Test Author',
      Email: `preload-${Date.now()}@example.com`,
    },
    published: true,
  };

  const authorResp = await makeReq(authorBody);
  console.log('Author response:', JSON.stringify(authorResp, null, 2));

  const authorId = authorResp?.data?.entry?.id;
  if (!authorId) {
    console.error('Author creation failed or no id returned');
    process.exit(1);
  }

  console.log('\nCreating a BlogPost with preload: ["Author"]');
  const postBody = {
    op_type: 'create_entry',
    type: 'blog_post',
    field_values: {
      Title: 'Preload Test Post',
      Content: 'This post was created to test preload on create/update',
      Author: authorId,
      Excerpt: 'Preload test',
      IsPublished: true,
      PublishedDate: new Date().toISOString().slice(0, 10),
    },
    published: true,
    preload: ['author'],
  };

  const postResp = await makeReq(postBody);
  console.log('Create post response:', JSON.stringify(postResp, null, 2));

  const postId = postResp?.data?.entry?.id;
  if (!postId) {
    console.error('Post creation failed or no id returned');
    process.exit(1);
  }

  console.log('\nUpdating the post with preload: ["Author"] (change Title)');
  const updateBody = {
    op_type: 'update_entry',
    entry_id: postId,
    field_values: {
      Title: 'Preload Test Post (updated)'
    },
    published: true,
    preload: ['author'],
  };

  const updateResp = await makeReq(updateBody);
  console.log('Update post response:', JSON.stringify(updateResp, null, 2));

  console.log('\nDone. Look for `author` object in the `entry` payloads above to confirm preload worked.');
};

run().catch(err => {
  console.error('Error running test script:', err);
  process.exit(1);
});
