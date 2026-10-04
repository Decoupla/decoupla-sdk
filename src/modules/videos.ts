import { z } from 'zod';
import { camelToSnake } from './schema';
import { imageTransformSchema } from './images';
import type { VideoOptions } from '../types/videos';

const transform = z.object({ thumbnail: imageTransformSchema.optional() }).strict();
export function normalizeVideos(input: unknown, depth = 0): VideoOptions | undefined {
    if (input === undefined && depth === 0) return undefined;
    if (depth > 10) throw new Error('Video options exceed maximum reference depth (10)');
    const tree = z.record(z.string(), z.unknown()).parse(input);
    const out: VideoOptions = {};
    for (const [field, value] of Object.entries(tree)) {
        if (field === 'references') {
            const branches = z.record(z.string(), z.unknown()).parse(value);
            const refs: Record<string, VideoOptions> = {};
            for (const [key, branch] of Object.entries(branches)) {
                const normalized = camelToSnake(key);
                if (normalized in refs) throw new Error(`Duplicate video reference: ${key}`);
                refs[normalized] = normalizeVideos(branch, depth + 1)!;
            }
            out.references = refs;
        } else {
            const key = camelToSnake(field);
            if (key in out) throw new Error(`Duplicate video field: ${field}`);
            out[key] = transform.parse(value);
        }
    }
    return out;
}
