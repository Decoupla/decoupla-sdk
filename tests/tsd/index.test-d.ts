import { expectType } from 'tsd';
import { createClient } from '../../src';
import { LevelOneContentType } from '../decoupla.config';

// Stricter assertions: ensure the returned shape includes nested preloaded `child.title` as a string
declare const client: ReturnType<typeof createClient>;

// getEntries should return a promise whose data array elements have a `child` with `title: string` when preloaded
expectType<Promise<{ data: Array<{ id: string; child?: { id: string; title: string } | undefined }>; }>>(client.getEntries(LevelOneContentType, { filters: {}, preload: [['Child', ['Child']]], limit: 1 }));

// getEntry should return a promise whose data has a `child` with `title: string` when preloaded
expectType<Promise<{ data: { id: string; child?: { id: string; title: string } | undefined } }>>(client.getEntry(LevelOneContentType, 'some-id', { preload: [['Child', ['Child']]] }));
