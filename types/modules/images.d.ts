import { z } from 'zod';
import type { ImageOptions } from '../types/images';
export declare const imageTransformSchema: z.ZodObject<{
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    format: z.ZodOptional<z.ZodEnum<{
        jpg: "jpg";
        png: "png";
        webp: "webp";
        avif: "avif";
    }>>;
}, z.core.$strict>;
export declare function normalizeImages(input: unknown, depth?: number): ImageOptions | undefined;
