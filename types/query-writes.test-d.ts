import { expectAssignable, expectError, expectType, expectNotAssignable } from 'tsd';
import { createClient, defineContentType, type CreateFieldValues, type UpdateFieldValues, type SortSpec } from '.';

const Author = defineContentType({ name: 'author', fields: { FullName: { type: 'string', required: true } } });
const Post = defineContentType({ name: 'post', fields: {
    Title: { type: 'string', required: true }, ViewCount: { type: 'int', required: true },
    PublishedDate: { type: 'date' }, Tags: { type: 'string[]' }, HeroImage: { type: 'image' },
    Authors: { type: 'reference[]', references: [Author] }, Published: { type: 'boolean' },
    Data: { type: 'json' }, Text: { type: 'text' },
} });
const client = createClient({ apiToken: 'test', workspace: 'test' });
expectAssignable<CreateFieldValues<typeof Post>>({ Title: 'Post', viewCount: 1 });
expectAssignable<CreateFieldValues<typeof Post>>({ title: 'Post', view_count: '1', publishedDate: new Date(), heroImage: { id: 'image' }, authors: ['author'] });
expectAssignable<UpdateFieldValues<typeof Post>>({ heroImage: null, authors: [{ id: 'author' }], published: 'true', data: { nested: [null, 1] } });
expectError(client.createEntry(Post, {}));
expectError(client.createEntry(Post, { Title: 'Post' }));
expectError(client.createEntry(Post, { Title: null, ViewCount: 1 }));
expectError(client.createEntry(Post, { Title: 'Post', ViewCount: true }));
expectError(client.createEntry(Post, { Title: 'Post', ViewCount: 1, Unknown: 'bad' }));
expectError(client.updateEntry(Post, 'id', { tags: 'bad' }));
expectError(client.updateEntry(Post, 'id', { authors: [42] }));
expectError(client.updateEntry(Post, 'id', { heroImage: { url: 'bad' } }));
expectError(client.updateEntry(Post, 'id', { viewCount: {} }));
expectError(client.updateEntry(Post, 'id', { Unknown: 1 }));
client.updateEntry(Post, 'id', {});
client.createEntry(Post, { title: 'Post', ViewCount: 1 }, false);
expectAssignable<SortSpec<typeof Post>>([['ViewCount', 'DESC'], ['title', 'ASC'], ['id', 'ASC']]);
expectError(client.getEntries(Post, { sort: ['Title', 'ASC'] }));
expectError(client.getEntries(Post, { sort: [['Unknown', 'ASC']] }));
expectError(client.getEntries(Post, { sort: [['HeroImage', 'ASC']] }));
expectError(client.getEntries(Post, { sort: [['Text', 'ASC']] }));
expectError(client.getEntries(Post, { sort: [['Title', 'RANDOM']] }));
async function readTypes() {
    const nullable = await client.getEntry(Post, 'id', { preload: ['Authors'] });
    expectNotAssignable<{ title: string }>(nullable.data);
    if (nullable.data) expectType<string>(nullable.data.title);
    const strict = await client.getEntryOrThrow(Post, 'id', { preload: ['Authors'] });
    expectType<string>(strict.data.title);
    expectType<string | undefined>(strict.data.authors?.[0]?.fullName);
    const all = await client.getAllEntries(Post, { preload: ['Authors'], pageSize: 20 });
    expectType<string | undefined>(all.data[0]?.authors?.[0]?.fullName);
    for await (const entry of client.iterateEntries(Post, { preload: ['Authors'] })) {
        expectType<string>(entry.title);
        expectType<string | undefined>(entry.authors?.[0]?.fullName);
    }
}
expectError(client.getAllEntries(Post, { limit: 20 }));
expectError(client.getAllEntries(Post, { returnCount: true }));

const enumType = defineContentType({ name: 'status', fields: { Status: { type: 'string', options: ['draft', 'live'] as const } } });
client.createEntry(enumType, { status: 'draft' });
expectError(client.createEntry(enumType, { status: 'invalid' }));
const readonlySort = [['Title', 'ASC']] as const;
client.getEntries(Post, { sort: readonlySort });

const noEnum = defineContentType({ name: 'free', fields: { Value: { type: 'string', options: [] as const } } });
client.createEntry(noEnum, { value: 'anything' });
