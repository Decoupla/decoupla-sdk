import { expectType, expectError } from 'tsd';
import { createClient, defineContentType, type EntryPageInfo } from '.';
const Post = defineContentType({ name: 'post', fields: { Title: { type: 'string', required: true } } });
const client = createClient({ apiToken: 'test', workspace: 'test' });
async function types() {
    const page = await client.getEntries(Post, { keyset: true, returnCount: true, countLimit: 1000 });
    expectType<EntryPageInfo>(page.pageInfo);
    expectType<number>(page.count);
    expectType<boolean | undefined>(page.countIsExact);
    expectType<string>(page.data[0]!.title);
    const legacy = await client.getEntries(Post);
    expectError(legacy.pageInfo);
    const all = await client.getAllEntries(Post, { keyset: true, after: 'opaque', pageSize: 100 });
    expectType<string>(all.data[0]!.title);
}
expectError(client.getAllEntries(Post, { before: 'cursor' }));
expectError(client.updateEntries(Post, { filters: {}, values: {}, keyset: true }));

expectError(client.getEntries(Post, { keyset: true, offset: 0 }));
expectError(client.getEntries(Post, { after: 'cursor' }));
expectError(client.getEntries(Post, { countLimit: 1000 }));
