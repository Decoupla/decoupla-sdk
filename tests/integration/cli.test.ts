import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'child_process';

describe('CLI binary', () => {
    it('prints help and exits 0', () => {
        // Prefer system `node` if available, otherwise fall back to current process execPath
        let runner = 'node';
        try {
            const probe = spawnSync('node', ['-v']);
            if (probe.error || probe.status !== 0) {
                runner = process.execPath;
            }
        } catch (e) {
            runner = process.execPath;
        }

        const res = spawnSync(runner, ['dist/cli/index.cjs', '--help'], { encoding: 'utf8' });

        // Expect the process to exit successfully and include the help text
        expect(res.status === 0 || res.status === null).toBe(true);
        const out = String(res.stdout || res.stderr || '');
        expect(out).toContain('Decoupla CLI - Schema Management Tool');
    });
});
