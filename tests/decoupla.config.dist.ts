import { defineContentType, defineConfig } from '../dist/index.js';

export const AuthorContentType = defineContentType({
    name: 'author',
    displayName: 'Author',
    description: 'Blog post authors',
    fields: {
        Name: { type: 'string', required: true, isLabel: true },
        Email: { type: 'string', required: false },
        Bio: { type: 'text', required: false },
    },
});

export default defineConfig({
    workspace: process.env.DECOUPLA_WORKSPACE || 'test-workspace',
    apiToken: process.env.DECOUPLA_API_TOKEN || 'test-token',
    contentTypes: [AuthorContentType],
});
