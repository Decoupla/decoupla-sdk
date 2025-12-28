import { describe, it, expect } from 'bun:test';
import { parseCliArgs } from '../../src/cli/index';

describe('parseCliArgs', () => {
    it('returns help when no args', () => {
        const res = parseCliArgs([]);
        expect(res.command).toBe('help');
        expect(res.help).toBe(true);
    });

    it('recognizes --help and -h', () => {
        expect(parseCliArgs(['--help']).command).toBe('help');
        expect(parseCliArgs(['-h']).command).toBe('help');
    });

    it('recognizes --version and -v', () => {
        expect(parseCliArgs(['--version']).command).toBe('version');
        expect(parseCliArgs(['-v']).command).toBe('version');
    });

    it('parses flags before the command (e.g. --verbose sync)', () => {
        const res = parseCliArgs(['--verbose', 'sync']);
        expect(res.command).toBe('sync');
        expect(res.verbose).toBe(true);
    });

    it('parses flags after the command (e.g. sync --dry)', () => {
        const res = parseCliArgs(['sync', '--dry']);
        expect(res.command).toBe('sync');
        expect(res.dry).toBe(true);
    });
});
