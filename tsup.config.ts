import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read package.json to embed the version into built bundles. This lets the
// CLI print a version without needing to read the file at runtime when
// installed from npm.
const pkgPath = resolve(process.cwd(), 'package.json');
let pkgVersion = 'unknown';
try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg && pkg.version) pkgVersion = String(pkg.version);
} catch (err) {
    // ignore
}

export default defineConfig({
    entry: ['src/index.ts', 'src/cli/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
    target: 'node14',
    clean: true,
    splitting: false,
    shims: true,
    // Define a compile-time replacement so source code can reference
    // the token `__PACKAGE_VERSION__` which will be replaced by the
    // actual package version string.
    define: {
        __PACKAGE_VERSION__: JSON.stringify(pkgVersion),
    },
});
