# Decoupla.js

A **type-safe TypeScript client** for the Decoupla headless CMS with integrated CLI tools for schema management and synchronization.

- ✅ **Full Type Safety** - Compile-time validation of content types, fields, and queries
- 🚀 **Zero Runtime Overhead** - Thin client wrapper around the Decoupla API
- 🔄 **Automatic Schema Sync** - CLI tool keeps your local definitions in sync with the backend
- 🏗️ **Content Type Definitions** - Define schema once, use everywhere with full IDE support
- 🔍 **Type-Safe Filtering** - Filter operations validated per field type at compile time
- 📦 **Bun & npm Compatible** - Works with Bun and npm/yarn

## Quick Start

### 1. Installation

Install via npm (recommended) or Bun. The package name is taken from the npm package metadata.

```bash
# npm

const Author = defineContentType({
  name: 'author',
  displayName: 'Author',
  description: 'Blog post authors',
  fields: {
    Name: { type: 'string', required: true, isLabel: true },
    Email: { type: 'string', required: false },
    Bio: { type: 'text', required: false },
  },
});

const BlogPost = defineContentType({
  name: 'blog_post',
  displayName: 'Blog Post',
  description: 'Published blog posts',
  fields: {
    Title: { type: 'string', required: true, isLabel: true },
    Content: { type: 'text', required: true },
    Author: {
      type: 'reference',
      required: false,
      references: [Author],
    },
    IsPublished: { type: 'boolean', required: false },
    ViewCount: { type: 'int', required: false },
  },
});

// Export your configuration
export default defineConfig({
  workspace: process.env.DECOUPLA_WORKSPACE!,
  apiToken: process.env.DECOUPLA_API_TOKEN!,
  contentTypes: [Author, BlogPost],
});
```

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

// Create an entry
const newPost = await client.createEntry(BlogPost, {
  Title: 'My First Post',
  Content: 'Hello, World!',
  IsPublished: false,
});

// Update an entry
await client.updateEntry(BlogPost, newPost.id, {
  IsPublished: true,
});
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
  settings: { /* custom */ },  // Future: localization, validations, etc.
}
```

---

## CLI Commands

### `decoupla sync`

Synchronize your local schema with the backend.

```bash
# Dry run - preview changes
bunx decoupla sync --dry

# Apply changes with verbose output
bunx decoupla sync --verbose

# Apply changes silently
bunx decoupla sync
```

The sync command will:
- Create missing content types
- Add new fields
- Update field properties (required, type, references)
- Remove fields that are no longer defined

### `decoupla validate`

Validate your schema definitions:

```bash
bunx decoupla validate
```

### `decoupla help`

Show available commands:

```bash
bunx decoupla help
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
  getEntry: (contentTypeDef, entryId, options?) => Promise
  getEntries: (contentTypeDef, options?) => Promise
  createEntry: (contentTypeDef, fieldValues, published?) => Promise
  updateEntry: (contentTypeDef, entryId, fieldValues, published?) => Promise
  upload: (file, filename?) => Promise
  inspect: () => Promise
  sync: (contentTypes) => Promise
  syncWithFields: (contentTypes, options?) => Promise
  deleteContentType: (contentTypeName) => Promise
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

console.log(post.data.title); // Type-safe field access
```

**Options:**

```typescript
{
  preload?: string | string[]; // Fields to preload
}
```

Preload supports a nested-array grammar for multi-level reference preloads. Example: to preload a reference field `Child` and then preload its `Child` field, use:

```typescript
// Nested-array preload grammar: [['Child', ['Child']]]
const post = await client.getEntry(BlogPost, 'post-id-123', {
  preload: [['Child', ['Child']]] // no `as const` needed with TypeScript 5+ (const generics)
});
```

Both `getEntry` and `getEntries` accept the same nested-array preload form and the client supports TypeScript 5 const-generic inference so inline literals do not require `as const`.

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
  preload?: string | string[];    // Preload references
}
```

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
{ ViewCount: { between: [10, 100] } }
{ ViewCount: { in: [10, 20, 30] } }

// Boolean fields
{ IsPublished: { eq: true } }

// Date fields
{ CreatedAt: { gte: '2024-01-01' } }
{ CreatedAt: { between: ['2024-01-01', '2024-12-31'] } }

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
const entry = await client.createEntry(BlogPost, {
  Title: 'My First Post',
  Content: 'Hello, World!',
  IsPublished: false,
});

console.log(entry.id);        // Entry ID
console.log(entry.createdAt); // Timestamp
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
const updated = await client.updateEntry(BlogPost, 'post-id-123', {
  ViewCount: 150,
  IsPublished: true,
});
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
    Price: { between: [10, 100] },
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

---

## Contributing

Contributions are welcome! Please check the [CONTRIBUTING.md](./CONTRIBUTING.md) file.

---

## License

MIT © 2024 Decoupla
