import { describe, it, expect } from 'bun:test';

describe('dist bundle', () => {
    it('exports the public API from dist ESM build', async () => {
        const mod = await import('../../dist/index.js');

        // Basic smoke tests for public exports
        expect(typeof mod.createClient).toBe('function');
        expect(typeof mod.defineContentType === 'function' || typeof mod.defineContentType === 'object').toBe(true);
        expect(mod).toHaveProperty('createClient');
    });
});
