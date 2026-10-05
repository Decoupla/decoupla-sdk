# @decoupla/sdk

A **type-safe TypeScript client** for the Decoupla headless CMS with integrated CLI tools for schema management and synchronization.

- ✅ **Full Type Safety** - Compile-time validation of content types, fields, and queries
- 🚀 **Zero Runtime Overhead** - Thin client wrapper around the Decoupla API
- 🔄 **Automatic Schema Sync** - CLI tool keeps your local definitions in sync with the backend
- 🏗️ **Content Type Definitions** - Define schema once, use everywhere with full IDE support
- 🔍 **Type-Safe Filtering** - Filter operations validated per field type at compile time
- 📦 **Bun & npm Compatible** - Works with Bun and npm/yarn

## Quick Start

### 1. Installation

Install the package from npm (recommended) or with Bun/Yarn. The package name is
`@decoupla/sdk` and includes both the TypeScript client and the CLI binary.

```bash
# npm
npm install @decoupla/sdk

# yarn
yarn add @decoupla/sdk

# bun
bun add @decoupla/sdk
```

Notes:
- The package exports TypeScript types; if you're using TypeScript the types are included.
- The CLI (`decoupla`) is available via `npx decoupla ...` (npm) or `bunx decoupla ...` (Bun).

After installing, continue to define your content types and configuration (see the
"Content Type Definition" section below.

### 2. Define Content Types

Define your content types with `defineContentType` (see the "Content Type Definition" section).
Keep your content type definitions exported from a central module (for example `src/content-types.ts`) so
both your application code and `decoupla.config.ts` can import the same typed definitions.

### 3. Sync Your Schema

Run the CLI to sync your local definitions with the backend. You can use `npx` (or `bunx` if you're on Bun) to run the installed binary:

```bash
# Preview changes (dry run)
npx decoupla sync --dry

# Apply changes
npx decoupla sync

# Verbose output
npx decoupla sync --verbose
```

This will create or update all content types defined in your `decoupla.config.ts`.

### 4. Use the Client

```typescript
import { createClient } from '@decoupla/sdk';

const client = createClient({
  workspace: process.env.DECOUPLA_WORKSPACE!,
  apiToken: process.env.DECOUPLA_API_TOKEN!,
});

// Query entries with type safety
const posts = await client.getEntries(BlogPost, {
  filters: {
    IsPublished: { eq: true },
    ViewCount: { gte: 100 },
  },
  sort: [['ViewCount', 'DESC']],
  limit: 10,
});

// NOTE:
// The `published` option passed to `createEntry`/`updateEntry` is a server-side
// command that tells the backend whether the entry should be published immediately.
// Create an entry as draft (unpublished)

const newPostMeta = await client.createEntry(BlogPost, {
  Title: 'My First Post',
  Content: 'Hello, World!',
}, false);

// Create an entry and request preloaded relations in the response
const newPostWithPreload = await client.createEntry(BlogPost, {
  Title: 'Post with Preload',
  Content: 'This post requests preload',
  Author: 'author-id-123',
}, { published: true, preload: ['Author'] });

// Note: when you pass `preload` the client will return the full normalized entry
// inside a `{ data: ... }` payload so you can access `newPostWithPreload.data.author` directly.

// Update an entry — provide an options object for publishing and preload behavior
const updateResult = await client.updateEntry(BlogPost, newPostMeta.id, {
  Title: 'My First Post (published)'
}, { published: true, preload: ['Author'] });
```

---

## Configuration

### Environment Variables

Set these environment variables or pass them directly to functions:

```bash
DECOUPLA_WORKSPACE=your-workspace-id
DECOUPLA_API_TOKEN=your-api-token
```

### Content Type Definition

Use `defineContentType` to define your schema:

```typescript
const MyType = defineContentType({
  name: 'my_type',              // Required: slug name (snake_case)
  displayName: 'My Type',       // Optional: human-readable name
  description: 'My description', // Optional: describe the type
  fields: {
    // Field definitions here
  },
});

Note: `name` is the machine-facing slug used to identify the content type in the API and CLI. It will be normalized to snake_case by the config loader (e.g. "BlogPost" -> "blog_post", "My Type" -> "my_type"). `displayName` is optional and intended as a human-readable label shown in UIs and logs.
```

**Important:** We strongly recommend using a `decoupla.config.ts` file to store your `workspace`, `apiToken`, and `contentTypes`.
The CLI reads this file when you run `decoupla sync`, and keeping a central config ensures the CLI and your application share the same type definitions and settings.

### decoupla.config.ts and contentTypes

Your project should export a configuration file (usually `decoupla.config.ts`) that the CLI reads. The important piece is the `contentTypes` array — this is where you list the content type definitions created with `defineContentType`.

Example `decoupla.config.ts`:

```typescript
import { defineConfig } from 'decoupla.js';
import { Author, BlogPost, Category } from './content-types'; // your defineContentType exports

export default defineConfig({
  workspace: process.env.DECOUPLA_WORKSPACE!,
  apiToken: process.env.DECOUPLA_API_TOKEN!,
  contentTypes: [Author, BlogPost, Category],
});
```

Notes:
- The CLI (`decoupla sync`) reads the exported `contentTypes` array and uses it to compare and synchronize your local schema with the remote workspace.
- Each item in `contentTypes` should be the result of `defineContentType(...)` (the library stores enough metadata to produce API requests and type-safe helpers).
- Keep the file next to your content-type definitions (for example `src/content-types.ts`) and export each content type so both the CLI and your application code can import the same definitions.

Using content type definitions in your application code:

```typescript
import { createClient } from '@decoupla/sdk';
import { BlogPost } from './content-types'; // same defineContentType exported above

const client = createClient({ workspace: '...', apiToken: '...' });

const post = await client.getEntry(BlogPost, 'post-id', { preload: ['Author'] });
```


### Field Types

Decoupla supports the following field types:

#### Primitive Types

```typescript
// Text
{ type: 'string', required: true }    // Short text
{ type: 'text', required: false }     // Long text
{ type: 'slug', required: false }     // URL-friendly slug

// Numbers
{ type: 'int', required: true }       // Integer
{ type: 'float', required: false }    // Decimal number

// Boolean
{ type: 'boolean', required: false }  // true/false

// Dates & Times
{ type: 'date', required: false }     // ISO date (YYYY-MM-DD)
{ type: 'time', required: false }     // ISO time (HH:MM:SS)
{ type: 'datetime', required: false } // ISO datetime

// Media
{ type: 'image', required: false }    // Image object
{ type: 'video', required: false }    // Video object

// Other
{ type: 'json', required: false }     // Arbitrary JSON
```

#### Array Types

```typescript
{ type: 'string[]', required: false }
{ type: 'int[]', required: false }
{ type: 'float[]', required: false }
{ type: 'boolean[]', required: false }
{ type: 'date[]', required: false }
{ type: 'image[]', required: false }
{ type: 'video[]', required: false }
```

#### References

```typescript
// Single reference
{ type: 'reference', references: [Author] }

// Multiple references (polymorphic)
{ type: 'reference', references: [Author, Reviewer, Editor] }

// Array of references
{ type: 'reference[]', references: [Comment] }
```

#### Field Options

```typescript
{
  type: 'string',
  required: true,              // Field must be provided
  isLabel: true,               // Use as display name
  options: ['active', 'inactive'],  // Restrict values (string/string[] only)
}
```

---

## CLI Commands

### `decoupla sync`

Synchronize your local schema with the backend.

```bash
# Dry run - preview changes
npx decoupla sync --dry   # npm
bunx decoupla sync --dry  # bun

# Apply changes with verbose output
npx decoupla sync --verbose   # npm
bunx decoupla sync --verbose  # bun

# Apply changes silently
npx decoupla sync   # npm
bunx decoupla sync  # bun
```

The sync command will:
- Create missing content types
- Add new fields
- Update field properties (required, type, references)
- Remove fields that are no longer defined

### `decoupla validate`

Validate your schema definitions:

```bash
bunx decoupla validate  # bun
npx decoupla validate   # npm
```

### `decoupla help`

Show available commands:

```bash
bunx decoupla help  # bun
npx decoupla help   # npm
```

---

## Client API

### `createClient(config)`

Initialize the API client:

```typescript
const client = createClient({
  workspace: 'my-workspace',
  apiToken: 'secret-token',
});
```

#### Returns

```typescript
{
  getEntry: (contentTypeDef, entryId, options?) => Promise<{ data: Entry | null }>
  getEntryOrThrow: (contentTypeDef, entryId, options?) => Promise<{ data: Entry }>
  iterateEntries: (contentTypeDef, options?) => AsyncGenerator<Entry>
  getAllEntries: (contentTypeDef, options?) => Promise<{ data: Entry[] }>
  getEntries: (contentTypeDef, options?) => Promise<{ data: Entry[] }> // or { data: Entry[], count: number } with returnCount
  // createEntry/updateEntry accept an options object { published?: boolean; preload?: PreloadSpec }.
  // When `preload` is provided the client returns the full normalized entry in `{ data: ... }`.
  createEntry: (contentTypeDef, fieldValues, publishedOrOptions?) => Promise<NormalizedEntryMetadata | { data: Entry }>
  updateEntry: (contentTypeDef, entryId, fieldValues, publishedOrOptions?) => Promise<NormalizedEntryMetadata | { data: Entry }>
  updateEntries: (contentTypeDef, options) => Promise<{ data: Entry[], updatedCount: number, failedCount: number, errors: ApiErrorDetail[][] }>
  upload: (file, filename?, controls?) => Promise<UploadResult>
  inspect: () => Promise<InspectResponse>
  sync: (contentTypes) => Promise<SyncResult>
  syncWithFields: (contentTypes, options?) => Promise<SyncResult>
  deleteContentType: (contentTypeName) => Promise<void>
}
```

---

## API Methods

### `getEntry(contentTypeDef, entryId, options?)`

Fetch a single entry by ID:

```typescript
const post = await client.getEntry(BlogPost, 'post-id-123', {
  preload: ['author'], // Preload references
});

if (post.data) console.log(post.data.title); // Type-safe field access
```

**Options:**

```typescript
{
  preload?: string | string[]; // Fields to preload
}
```

Note: you can now explicitly select which dataset you want to read using the `contentView` option.
Acceptable values are `'live'` (published content) and `'preview'` (draft/unpublished data). The default is `'live'`.

The client maps `contentView` to the server `api_type` parameter. Use `contentView: 'preview'` to
request draft/unpublished data and `contentView: 'live'` for published data.

Example:

```typescript
const postPreview = await client.getEntry(BlogPost, 'post-id-123', {
  contentView: 'preview',
  preload: [['Child', ['Child']]]
});
```

Preload supports a nested-array grammar for multi-level reference preloads. Example: to preload a reference field `Child` and then preload its `Child` field, use:

```typescript
// Nested-array preload grammar: [['Child', ['Child']]]
const post = await client.getEntry(BlogPost, 'post-id-123', {
  preload: [['Child', ['Child']]] // no `as const` needed with TypeScript 5+ (const generics)
});
```

Both `getEntry` and `getEntries` accept the same nested-array preload form and the client supports TypeScript 5 const-generic inference so inline literals do not require `as const`.

`getEntry` returns `{ data: null }` when the entry does not exist or is not visible
in the requested content view. Check `data` before accessing fields. This replaces
the previous empty-object behavior and makes the return type nullable.

### `getEntryOrThrow(contentTypeDef, entryId, options?)`

Use this when the entry must exist. It accepts the same preload, image, and content
view options as `getEntry`, returns non-null `data`, and throws `EntryNotFoundError`
for a missing entry. The error exposes `contentType` and `entryId`; authorization
and network errors propagate unchanged.

```ts
const post = await client.getEntryOrThrow(BlogPost, entryId, {
  preload: ['Author'],
});
console.log(post.data.title);
```

### `getEntries(contentTypeDef, options?)`

Query entries with filters, sorting, and pagination:

```typescript
const posts = await client.getEntries(BlogPost, {
  filters: {
    IsPublished: { eq: true },
    ViewCount: { gte: 100 },
  },
  sort: [['ViewCount', 'DESC']],
  limit: 20,
  offset: 0,
  preload: ['author'],
});

console.log(posts.data); // Array of entries
```

**Options:**

```typescript
{
  filters?: TypeSafeFilters;     // Query filters (type-checked)
  sort?: [string, 'ASC' | 'DESC'][]; // Sort by fields
  limit?: number;                 // Max results
  offset?: number;                // Pagination offset
  keyset?: boolean;               // Opt into cursor pagination
  after?: string;                 // Forward cursor (requires keyset)
  before?: string;                // Backward cursor (requires keyset)
  countLimit?: number;            // Count cap; requires returnCount: true
  preload?: string | string[];    // Preload references
  returnCount?: boolean;          // Include total count in response
  contentView?: 'live' | 'preview'; // Dataset to query (default: 'live')
}
```

When `returnCount` is `true`, the response includes a `count` field alongside the entries:

```typescript
const result = await client.getEntries(BlogPost, {
  filters: { IsPublished: { eq: true } },
  returnCount: true,
});

console.log(result.data);  // Array of entries
console.log(result.count); // Total matching entries
```

### Iterate or fetch all entries

For large collections, opt into keyset pagination. Offset calls remain compatible
and remain the default for existing code. Deploy the backend keyset/count support
before opting in; the SDK does not silently fall back or restart expired cursors.

```ts
const first = await client.getEntries(BlogPost, {
  keyset: true, limit: 100, returnCount: true, countLimit: 1000,
});
console.log(`${first.count}${first.countIsExact === false ? '+' : ''}`);
if (first.pageInfo.hasNextPage && first.pageInfo.endCursor) {
  const next = await client.getEntries(BlogPost, {
    keyset: true, limit: 100, after: first.pageInfo.endCursor,
  });
  if (next.pageInfo.hasPreviousPage && next.pageInfo.startCursor) {
    await client.getEntries(BlogPost, {
      keyset: true, limit: 100, before: next.pageInfo.startCursor,
    });
  }
}
```

Keep filters, sorting, preloads, project, and content view consistent between
pages. Start again without cursors when changing the query scope. Cursors are
opaque, signed, and expire after seven days. Keyset reads accept a limit of 1–500;
combine neither `offset` with keyset mode nor `after` with `before`.
`countLimit` accepts 1–1,000,000 and requires `returnCount: true`. It also works
with offset reads. `countIsExact` is optional when no cap is requested; capped
responses must include the flag. Navigation needs page flags, not a count.

```ts
for await (const post of client.iterateEntries(BlogPost, {
  keyset: true, pageSize: 100, preload: ['Author'],
})) {
  console.log(post.title);
}
const all = await client.getAllEntries(BlogPost, { keyset: true, pageSize: 100 });
```

Keyset iteration follows `hasNextPage` and the returned `endCursor`, with no extra
request after an exact-size final page. `after` optionally resumes traversal.
Missing/repeated next cursors or malformed metadata fail instead of looping.
Export errors, including expired cursors, propagate to the caller; restart an
export explicitly if desired. Concurrent edits can move entries between pages:
neither offset nor keyset iteration provides a snapshot.

`iterateEntries` lazily yields individual entries. Breaking the loop stops future
page requests. `getAllEntries` collects those entries into `{ data: Entry[] }`.
Both preserve filters, preloads, image options, and `contentView`.

```ts
for await (const post of client.iterateEntries(BlogPost, {
  pageSize: 100,
  preload: ['Author'],
  sort: [['Title', 'ASC']],
})) {
  console.log(post.title);
}

const allPosts = await client.getAllEntries(BlogPost, {
  pageSize: 100,
  contentView: 'preview',
  images: { featuredImage: { width: 400, format: 'webp' } },
});
console.log(allPosts.data.length);
```

`pageSize` defaults to 100 and must be a positive safe integer. In offset mode,
`offset` optionally selects the starting position. These helpers use `pageSize` instead of `limit` and
do not accept `returnCount`. In offset mode they stop at a short or empty page; in
keyset mode `pageSize` cannot exceed 500 and page flags determine completion. Both propagate any
request failure. `getAllEntries` keeps all results in memory; use the iterator for
large datasets.

Sorting supports an array of field/direction tuples, with schema, camelCase, or
snake_case field names. Scalar fields and `id` are sortable; images, references,
arrays, JSON, and text fields are excluded. Pagination appends `['id', 'ASC']` when
no ID sort is supplied, giving a stable tie-breaker. Offset pagination is not a
snapshot: concurrent inserts, deletions, or edits can still change page boundaries.

### Filter Operations

Filters are type-safe based on field type:

```typescript
// String fields
{ Title: { eq: 'My Post' } }
{ Title: { contains: 'blog' } }
{ Title: { starts_with: 'The' } }
{ Title: { in: ['Title1', 'Title2'] } }

// Numeric fields
{ ViewCount: { gte: 100 } }
{ ViewCount: { between: { lower: 10, upper: 100 } } }
{ ViewCount: { outside: { lower: 10, upper: 100 } } }
{ ViewCount: { in: [10, 20, 30] } }

// Boolean fields
{ IsPublished: { eq: true } }

// Date fields
{ CreatedAt: { gte: '2024-01-01' } }
{ CreatedAt: { between: { lower: '2024-01-01', upper: '2024-12-31' } } }

// Null checks
{ Email: { is_null: true } }
{ Email: { is_not_null: true } }

// Array fields - list operators
{ Tags: { any: { eq: 'featured' } } }
{ Tags: { every: { eq: 'active' } } }
{ Tags: { none: { eq: 'archived' } } }

// Reference fields
{ Author: { eq: 'author-id-123' } }
{ Author: { in: ['author-1', 'author-2'] } }

// Polymorphic references - filter by specific type
{ Content: { Author: { id: { eq: 'author-123' } } } }
```

### Logical Operators

Combine filters with `and` and `or`:

```typescript
const results = await client.getEntries(BlogPost, {
  filters: {
    and: [
      { IsPublished: { eq: true } },
      {
        or: [
          { ViewCount: { gte: 1000 } },
          { Featured: { eq: true } },
        ],
      },
    ],
  },
});
```

### `createEntry(contentTypeDef, fieldValues, published?)`

Create a new entry:

```typescript
// Boolean `published` positional arg
const meta = await client.createEntry(BlogPost, {
  Title: 'My First Post',
  Content: 'Hello, World!',
}, false);

// Or use the options object to pass `published` and `preload`.
// When `preload` is provided the client returns the full normalized entry
// inside `{ data: ... }` so you can read relations directly.
const created = await client.createEntry(BlogPost, {
  Title: 'Post with relations',
  Content: 'Post body',
  Author: 'author-id-123',
}, { published: true, preload: ['Author'] });

// Access metadata or full data depending on call:
console.log(meta.id);               // Entry metadata (no preload)
console.log(created.data.author);   // Preloaded relation (if requested)
```

**Returns:**

```typescript
{
  id: string;
  modelId: string;
  state: string;
  lastVersion: number;
  lastPublishedVersion: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### `updateEntry(contentTypeDef, entryId, fieldValues, published?)`

Update an existing entry:

```typescript
// Backwards-compatible boolean `published` positional arg
const updatedMeta = await client.updateEntry(BlogPost, 'post-id-123', {
  ViewCount: 150,
}, false);

console.log(updatedMeta.id); // Entry metadata (no preload)

// Or use options object and request preload in the response
const updated = await client.updateEntry(BlogPost, 'post-id-123', {
  ViewCount: 150,
}, { published: true, preload: ['Author'] });

// With preload, updateEntry returns { data: { ...full entry with relations... } }
console.log(updated.data.author); // Preloaded relation
```

### Typed field values for creates and updates

Write values are inferred from the content type. Creates require all fields marked
`required: true`; updates accept any subset. Field names support schema, camelCase,
and snake_case spellings. Unknown fields and incompatible values are rejected by
TypeScript. Literal string options declared with `as const` constrain allowed values.

Image, video, and reference writes accept IDs or objects containing an `id`, and
array fields accept arrays of the corresponding write values. Read objects remain
separately typed. Optional fields can be cleared with `null`.

Existing coercions remain supported, including numeric strings, boolean strings
`'true'`/`'false'` or numbers `0`/`1`, and `Date` values for date/time fields. Runtime
validation still checks actual values and collects field errors.

```ts
import type { CreateFieldValues, UpdateFieldValues } from '@decoupla/sdk';

const values: CreateFieldValues<typeof BlogPost> = {
  Title: 'New post',
  Content: 'Body',
  Author: { id: authorId },
};
const changes: UpdateFieldValues<typeof BlogPost> = { ViewCount: '150' };
await client.createEntry(BlogPost, values);
await client.updateEntry(BlogPost, entryId, changes);
```

### `upload(file, filename?)`

Upload an image or video:

```typescript
// From File input
const input = document.querySelector('input[type="file"]');
const file = input.files[0];
const uploaded = await client.upload(file);

// From Blob
const blob = new Blob(['data'], { type: 'image/jpeg' });
const uploaded = await client.upload(blob, 'image.jpg');

// Returns
{
  id: string;
  url: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  format?: string;
}
```

### `inspect()`

Get the current schema from the backend:

```typescript
const schema = await client.inspect();

console.log(schema.data.content_types); // All content types
```

### `sync(contentTypes)`

Programmatically sync content types:

```typescript
const result = await client.sync([Author, BlogPost], {
  dryRun: true,
  verbose: true,
});

console.log(result.actions); // List of sync actions
```

### `syncWithFields(contentTypes, options?)`

Full sync including field updates:

```typescript
const result = await client.syncWithFields(
  [Author, BlogPost],
  {
    dryRun: false,
    createMissing: true,
    createMissingFields: true,
    updateFields: true,
  }
);
```

---

## Examples

### Blog with Authors and Comments

```typescript
// decoupla.config.ts
import { defineContentType, defineConfig } from '@decoupla/sdk';

const Author = defineContentType({
  name: 'author',
  displayName: 'Author',
  fields: {
    Name: { type: 'string', required: true, isLabel: true },
    Email: { type: 'string', required: true },
    Bio: { type: 'text', required: false },
  },
});

const Comment = defineContentType({
  name: 'comment',
  displayName: 'Comment',
  fields: {
    Content: { type: 'string', required: true, isLabel: true },
    AuthorName: { type: 'string', required: true },
    AuthorEmail: { type: 'string', required: true },
  },
});

const BlogPost = defineContentType({
  name: 'blog_post',
  displayName: 'Blog Post',
  fields: {
    Title: { type: 'string', required: true, isLabel: true },
    Slug: { type: 'slug', required: true },
    Content: { type: 'text', required: true },
    FeaturedImage: { type: 'image', required: false },
    Author: {
      type: 'reference',
      required: true,
      references: [Author],
    },
    Comments: {
      type: 'reference[]',
      required: false,
      references: [Comment],
    },
    IsPublished: { type: 'boolean', required: false },
    PublishedAt: { type: 'datetime', required: false },
    Tags: { type: 'string[]', required: false },
    ViewCount: { type: 'int', required: false },
  },
});

export default defineConfig({
  workspace: process.env.DECOUPLA_WORKSPACE!,
  apiToken: process.env.DECOUPLA_API_TOKEN!,
  contentTypes: [Author, Comment, BlogPost],
});
```

```typescript
// app.ts
import { createClient } from '@decoupla/sdk';
import config from './decoupla.config';

const client = createClient(config);

// Get published posts sorted by views
const topPosts = await client.getEntries(BlogPost, {
  filters: {
    IsPublished: { eq: true },
  },
  sort: [['ViewCount', 'DESC']],
  limit: 5,
  preload: ['author', 'comments'],
});

// Get posts by a specific author
const authorPosts = await client.getEntries(BlogPost, {
  filters: {
    Author: { eq: 'author-id-123' },
    IsPublished: { eq: true },
  },
});

// Get posts with specific tags
const taggedPosts = await client.getEntries(BlogPost, {
  filters: {
    Tags: { any: { eq: 'featured' } },
  },
});

// Create a new post
const newPost = await client.createEntry(BlogPost, {
  Title: 'My First Post',
  Slug: 'my-first-post',
  Content: '# Welcome\n\nThis is my first post!',
  Author: 'author-id-123',
  IsPublished: false,
});

// Update the post (publish it)
await client.updateEntry(BlogPost, newPost.id, {
  IsPublished: true,
  PublishedAt: new Date().toISOString(),
});
```

### E-Commerce with Products

```typescript
const Category = defineContentType({
  name: 'category',
  displayName: 'Product Category',
  fields: {
    Name: { type: 'string', required: true, isLabel: true },
    Slug: { type: 'slug', required: true },
    Description: { type: 'text', required: false },
  },
});

const Product = defineContentType({
  name: 'product',
  displayName: 'Product',
  fields: {
    Name: { type: 'string', required: true, isLabel: true },
    Slug: { type: 'slug', required: true },
    Description: { type: 'text', required: true },
    Price: { type: 'float', required: true },
    StockQuantity: { type: 'int', required: true },
    Images: { type: 'image[]', required: false },
    Category: {
      type: 'reference',
      required: true,
      references: [Category],
    },
    IsAvailable: { type: 'boolean', required: true },
    Rating: { type: 'float', required: false },
  },
});

// Get available products
const available = await client.getEntries(Product, {
  filters: { IsAvailable: { eq: true } },
  sort: [['Rating', 'DESC']],
});

// Get products by category
const categoryProducts = await client.getEntries(Product, {
  filters: {
    Category: { eq: 'category-id-123' },
  },
});

// Get products in price range
const priceFiltered = await client.getEntries(Product, {
  filters: {
    Price: { between: { lower: 10, upper: 100 } },
  },
});
```

---

## Best Practices

### 1. Organize Content Types

Keep your content types in separate files for large projects:

```typescript
// types/author.ts
export const Author = defineContentType({
  name: 'author',
  fields: { /* ... */ },
});

// types/index.ts
export * from './author';
export * from './blog-post';

// decoupla.config.ts
import { Author, BlogPost } from './types';
export default defineConfig({
  // ...
  contentTypes: [Author, BlogPost],
});
```

### 2. Use Environment Variables

Never hardcode credentials:

```typescript
export default defineConfig({
  workspace: process.env.DECOUPLA_WORKSPACE!,
  apiToken: process.env.DECOUPLA_API_TOKEN!,
  contentTypes: [/* ... */],
});
```

### 3. Leverage Type Safety

Let TypeScript catch errors at compile time:

```typescript
// ✅ Type-safe - TypeScript checks field names and filter operations
const posts = await client.getEntries(BlogPost, {
  filters: {
    IsPublished: { eq: true },
    ViewCount: { gte: 100 },
  },
});

// ❌ TypeScript error - field doesn't exist
// const posts = await client.getEntries(BlogPost, {
//   filters: { NonExistent: { eq: true } },
// });

// ❌ TypeScript error - invalid operation for field type
// const posts = await client.getEntries(BlogPost, {
//   filters: { Title: { gte: 100 } }, // gte is for numbers, not strings
// });
```

### 4. Use Preload for References

Fetch related entries efficiently:

```typescript
const posts = await client.getEntries(BlogPost, {
  preload: ['author', 'comments'], // Fetch references in one call
});

// author and comments are now populated
for (const post of posts.data) {
  console.log(post.author); // Fully populated
}
```

### 5. Version Control Your Config

Commit `decoupla.config.ts` to track schema changes:

```bash
git add decoupla.config.ts
git commit -m "Add featured image to blog posts"
```

---

## Troubleshooting

### "Config file not found"

Make sure you have a `decoupla.config.ts` (or `.js`) in your project root.

### "Invalid API token"

Verify your `DECOUPLA_API_TOKEN` environment variable is set correctly.

### Type errors on field values

Field names in TypeScript are camelCase, but the config uses their original case. Both work:

```typescript
// In config
BlogPost = defineContentType({
  fields: {
    IsPublished: { type: 'boolean' },
  },
});

// In code - use the content type definition
client.createEntry(BlogPost, {
  isPublished: true, // camelCase field names
});
```

### Filter type mismatch

TypeScript enforces correct filter operations per field type:

```typescript
// ❌ Error - gte is for numbers
{ Title: { gte: 'hello' } }

// ✅ Correct
{ Title: { eq: 'hello' } }
{ ViewCount: { gte: 100 } }
```


### API tokens, errors, and request timeouts

Use unified workspace API tokens. Live reads require `get_entries`; preview reads require `get_draft_entries`. Draft and published writes require `draft` and `publish` respectively. Schema sync requires `manage_content_types`; uploads require `draft` or `publish`. Keep tokens on the server and grant only the permissions your integration needs. Revoked tokens fail authorization on subsequent requests.

```typescript
import { createClient, ApiError } from '@decoupla/sdk';

const client = createClient({
  apiToken: process.env.DECOUPLA_API_TOKEN!,
  workspace: process.env.DECOUPLA_WORKSPACE!,
  requestTimeoutMs: 30_000, // Default; covers the request and response body
});

try {
  await client.inspect();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.message);
    // error.errors retains structured backend fields and messages.
  } else {
    throw error;
  }
}
```

#### Rate limits

Each workspace may make a fixed number of API requests per minute, set by its plan. Responses carry `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset` headers. Over the limit, the API answers HTTP 429 with a `Retry-After` header and does not run the request.

The client retries rate-limited requests automatically, waiting as long as `Retry-After` asks (at most 60 seconds per wait). Because a limited request never ran, writes are retried safely too. Set `maxRetries` on the client (default `3`) or per call, and `0` disables retrying. The request timeout applies to each attempt, and a `signal` also cancels the wait between attempts.

```typescript
const client = createClient({ apiToken, workspace, maxRetries: 5 });

try {
  await client.getEntries(Post, { maxRetries: 0 }); // Fail fast for this call
} catch (error) {
  if (error instanceof ApiError && error.isRateLimitError) {
    console.warn(`Rate limited; retry in ${error.retryAfterSeconds}s`);
  }
}
```

`validateContentView(view)` returns `false` for authorization denial and for an empty workspace where access cannot be verified. Network, server, and malformed-response failures are thrown.

Schema dry-run plans the same creations and field changes as apply without issuing mutations. Applying sync reports only completed writes and returns errors for failures; the CLI exits nonzero when sync fails. A failed inspection stops writes. Sync is not transactional across requests, so successful writes before a later failure remain applied.

The current backend derives content-type slugs from the creation name. Sync therefore creates types using the stable definition `name`; `displayName` remains local metadata and does not change the remote creation name. Existing definitions must use the actual remote slug. Extra remote fields are preserved unless `deleteExtraFields` is explicitly enabled.


## Publishing a release

After changes are merged into `main`, open this repository's **Actions → Publish to npm → Run workflow**, select the `main` branch, and choose **patch**, **minor**, or **major**. Publishing is manual; ordinary pushes only run CI.

The workflow bumps the version, builds and tests that version, saves the tested npm package as a workflow artifact, and atomically pushes a version commit and `v<version>` tag. It then publishes that exact archive publicly to npm. SDK releases also commit regenerated type declarations. If `main` changes while checks run, publishing stops so you can start a fresh run against the new commit. Release runs are serialized.

### One-time setup

In the npm settings for `@decoupla/sdk`, add a GitHub Actions trusted publisher:

- Organization/user: `Decoupla`
- Repository: `decoupla-sdk`
- Workflow filename: `publish.yml`
- Environment: leave empty
- Allowed actions: enable direct `npm publish`

The workflow uses OIDC with Node 24; no npm publish token secret is needed. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/). The repository must allow the workflow's `GITHUB_TOKEN` to push the version commit to `main` and create release tags. If branch rules prevent that push, the workflow stops before npm publication.

If the npm publish job fails after the version commit/tag succeeds, fix the publishing configuration and choose **Re-run failed jobs** on that run. This reuses the tested archive and version without another bump. The artifact is retained for seven days. GitHub and npm are separate services: the version commit/tag can exist even if npm publication fails.

### Resize and convert images when reading entries

`getEntry` and `getEntries` accept an `images` tree. Image field names can use the
schema spelling (`FeaturedImage`) or returned camelCase spelling (`featuredImage`).
Use `references` to configure images inside preloaded entities:

```ts
const posts = await client.getEntries(Post, {
  preload: ['Author', ['RelatedPosts', ['Author']]],
  images: {
    featuredImage: { width: 1200, format: 'webp' },
    references: {
      author: { avatar: { width: 80, height: 80, format: 'webp' } },
      relatedPosts: {
        featuredImage: { width: 400, format: 'webp' },
        references: {
          author: { avatar: { width: 40, height: 40, format: 'webp' } },
        },
      },
    },
  },
});

const image = posts.data[0].featuredImage;
// image.width / image.height / image.format describe the source.
// image.output.url / width / height / format / byte_size describe the delivered variant.
```

The same options work with `getEntry(Post, entryId, { preload, images })` and with
`contentView: 'preview'`. One dimension preserves aspect ratio. Providing both
resizes and center-crops to that size. Omitting `format` preserves the source format;
providing only `format` converts without resizing. Supported output formats are
`jpg`, `png`, `webp`, and `avif`; SVG conversion is not exposed.

Image arrays apply the options to every image. Reference arrays apply their branch
to every preloaded entity, and the same source can have different variants on
different reference paths. Every configured reference must also appear in `preload`.
Polymorphic references apply options to matching fields on their declared targets.
Other images return their source URL without generating a duplicate variant.

Dimensions must be integers from 1 to 8192; resulting images cannot exceed 40 million
pixels. Image options support up to 10 reference levels. Invalid fields, formats,
options, or references missing from `preload` produce validation errors. Variants
are generated by the backend and reused on subsequent reads.

Image fields consistently return image objects, including `getEntry` without
preloads (which previously returned image IDs). Nested preloaded entry fields are
normalized to camelCase; JSON contents and image metadata retain their own keys.


### Video fields and thumbnails

Video fields return a `VideoObject` with `id`, `width`, `height`, `duration`,
`format`, `byte_size`, `output.url` for playback, and a nullable `thumbnail` image.
Video arrays return an array of these objects. This applies to root fields and
preloaded entities.

Use `videos` on reads to resize or convert thumbnails with the same image options:

```typescript
const posts = await client.getEntries(Post, {
  preload: ['Author'],
  videos: {
    heroVideo: { thumbnail: { width: 640, format: 'webp' } },
    references: {
      author: { introVideo: { thumbnail: { width: 160, format: 'webp' } } },
    },
  },
});
```

Every configured reference must appear in `preload`. Without thumbnail options,
the source thumbnail is returned; a video without a thumbnail returns `null` in
that property. Playback videos are not transcoded by these options. Deploy the
updated backend before using the SDK's video response types.

### Bulk updates

`updateEntries` applies typed partial values to entries selected by filters:

```typescript
const result = await client.updateEntries(Post, {
  filters: { Title: { eq: 'Old title' } },
  values: { Title: 'New title' },
  published: false,
  limit: 100,
  sort: [['id', 'ASC']],
});
console.log(result.updatedCount, result.failedCount, result.errors);
```

Filters are required; explicitly pass `{}` to select all matching entries.
The default limit is 1000 and `published` defaults to `true`. Set both explicitly
when appropriate. Filters, sorting, offsets, content views, and preloads use the
same options as `getEntries`. The backend selects active entries; this is not a
way to update every draft. Bulk updates are not atomic: successful updates remain
applied when other entries fail. `data` contains successful entries and `errors`
contains a list of backend errors for each failed entry. Request failures throw.

### Custom endpoints, fetch, and cancellation

```typescript
const client = createClient({
  workspace: 'my-workspace',
  apiToken: 'secret-token',
  apiUrl: 'http://localhost:4000/public/api/1.0/workspace/',
  fetch: globalThis.fetch, // Optional custom fetch implementation
  requestTimeoutMs: 30_000,
});
const controller = new AbortController();
const pending = client.getEntries(Post, {
  signal: controller.signal,
  requestTimeoutMs: 5_000,
});
controller.abort();
```

`apiUrl` is the endpoint prefix; the client appends the encoded workspace name.
Each client keeps its own endpoint and fetch implementation. Reads, pagination,
writes, inspection, schema sync, uploads, and content-type deletion support
`signal` and per-call `requestTimeoutMs` and `maxRetries` overrides. Pass these in the usual options
object; uploads use `upload(file, filename, controls)` and deletion uses
`deleteContentType(id, controls)`. Creates and single-entry updates accept an options
object instead of the publication boolean. Inspection and content-view validation
accept a controls object as their last argument.

Caller cancellation throws an error named `AbortError`; timeout failures throw
`ApiError`. Both cover response-body parsing as well as the request. Cancelling a
write cannot undo changes the server has already applied. Schema sync can report
mutation failures in its result, including cancellation after earlier writes.
