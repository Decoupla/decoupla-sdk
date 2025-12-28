import { expectAssignable } from 'tsd';
import { createClient } from '.';

// Build minimal, strongly-typed content type literals that mimic the branded shape the client expects
const LevelThree = {
    __isContentTypeDefinition: true,
    __definition: { name: 'level_three', fields: { Title: { type: 'string', required: true } } },
    __fields: {
        Title: { type: 'string' as const, required: true as const }
    }
} as const;

const LevelTwo = {
    __isContentTypeDefinition: true,
    __definition: {
        name: 'level_two',
        fields: {
            Title: { type: 'string', required: true },
            Child: { type: 'reference', required: false }
        }
    },
    __fields: {
        Title: { type: 'string' as const, required: true as const },
        Child: { type: 'reference' as const, required: false as const, references: [LevelThree] as unknown as any }
    }
} as const;

const LevelOne = {
    __isContentTypeDefinition: true,
    __definition: {
        name: 'level_one',
        fields: {
            Title: { type: 'string', required: true },
            Child: { type: 'reference', required: false }
        }
    },
    __fields: {
        Title: { type: 'string' as const, required: true as const },
        Child: { type: 'reference' as const, required: false as const, references: [LevelTwo] as unknown as any }
    }
} as const;

declare const client: ReturnType<typeof createClient>;

// getEntries should return a promise whose data array elements have a `child` with `title: string` when preloaded
// Accept either an expanded object with `title` or the lightweight not-loaded reference shape
type MaybeExpandedChild = { id: string; title: string } | { id: string; __sys_content_type: 'reference'; __sys_id: string; __sys_state: 'not_loaded' };

expectAssignable<Promise<{ data: Array<{ id: string; child?: MaybeExpandedChild | undefined }>; }>>(client.getEntries(LevelOne, { filters: {}, preload: [['Child', ['Child']]], limit: 1 }));

// getEntry should return a promise whose data has a `child` that may be expanded or lightweight
expectAssignable<Promise<{ data: { id: string; child?: MaybeExpandedChild | undefined } }>>(client.getEntry(LevelOne, 'some-id', { preload: [['Child', ['Child']]] }));
