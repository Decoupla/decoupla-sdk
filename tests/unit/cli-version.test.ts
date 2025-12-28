import { describe, it, expect } from 'bun:test';
// Import the helper from source so tests work during development
import { getVersionString } from '../../src/cli/index';

describe('CLI version', () => {
    it('returns package.json version', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // @ts-ignore
        const pkg = require(process.cwd() + '/package.json');
        const expected = String(pkg.version || 'unknown');
        expect(getVersionString()).toBe(expected);
    });
});
