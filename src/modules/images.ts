import { z } from 'zod';
import { camelToSnake } from './schema';
import type { ImageOptions } from '../types/images';

export const imageTransformSchema = z.object({
    width: z.number().int().min(1).max(8192).optional(),
    height: z.number().int().min(1).max(8192).optional(),
    format: z.enum(['jpg', 'png', 'webp', 'avif']).optional(),
}).strict().refine(value => !value.width || !value.height || value.width * value.height <= 40_000_000,
    'Image output must not exceed 40 million pixels');

// Validate recursively before normalization so unknown options are never silently dropped.
export function normalizeImages(input: unknown, depth = 0): ImageOptions | undefined {
    if (input === undefined && depth === 0) return undefined;
    if (depth > 10) throw new Error('Image options exceed maximum reference depth (10)');
    const tree = z.record(z.string(), z.unknown()).parse(input);
    const output: ImageOptions = {};
    for (const [key, value] of Object.entries(tree)) {
        if (key === 'references') {
            const branches = z.record(z.string(), z.unknown()).parse(value);
            const references: Record<string, ImageOptions> = {};
            for (const [field, branch] of Object.entries(branches)) {
                const normalized = camelToSnake(field);
                if (normalized in references) throw new Error(`Duplicate image reference: ${field}`);
                references[normalized] = normalizeImages(branch, depth + 1)!;
            }
            output.references = references;
        } else {
            const normalized = camelToSnake(key);
            if (normalized in output) throw new Error(`Duplicate image field: ${key}`);
            output[normalized] = imageTransformSchema.parse(value);
        }
    }
    return output;
}
