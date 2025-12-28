const path = require('path');
try {
    console.error('runner-abs: requiring esbuild-register');
    const reg = require('esbuild-register/dist/node');
    reg.register();
    console.error('runner-abs: esbuild-register registered');
    const resolved = path.resolve('tests/decoupla.config.ts');
    console.error('runner-abs: resolved path', resolved);
    const cfg = require(resolved);
    console.error('runner-abs: required config, keys:', Object.keys(cfg));
    process.exit(0);
} catch (e) {
    console.error('runner-abs: error', e && e.message ? e.message : e);
    process.exit(1);
}
