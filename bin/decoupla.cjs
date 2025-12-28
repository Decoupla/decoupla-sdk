#!/usr/bin/env node
/*
  CJS wrapper to run the decoupla CLI with sensible defaults for Node and Bun.
*/
const { spawnSync } = require('child_process');
const path = require('path');

function runCommand(cmd, args) {
    const res = spawnSync(cmd, args, { stdio: 'inherit' });
    process.exit(res.status === null ? 0 : res.status);
}

function hasCommand(cmd) {
    try {
        const probe = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
        return probe.status === 0 || probe.status === null;
    } catch (_) {
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);

    // Run Node and try to preload esbuild-register if present
    const node = process.execPath || 'node';
    let preloadArg = null;
    try {
        require.resolve('esbuild-register/dist/node');
        preloadArg = 'esbuild-register/dist/node';
    } catch (e) {
        // not installed
    }

    const entryCjs = path.join(__dirname, '..', 'dist', 'cli', 'index.cjs');

    if (preloadArg) {
        runCommand(node, ['-r', preloadArg, entryCjs, ...args]);
    } else {
        if (args.some(a => a.endsWith('.ts') || a.includes('.ts'))) {
            console.error('Warning: running without TypeScript loader. To use .ts configs with Node, install esbuild-register and try again:');
            console.error('  npm i -D esbuild-register');
            console.error('Or run the CLI with Bun which understands TypeScript files.');
        }
        runCommand(node, [entryCjs, ...args]);
    }
}

main();
