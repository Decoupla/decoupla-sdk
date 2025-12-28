// tiny runner to test requiring a TS config with esbuild-register
try {
    console.error('runner: requiring esbuild-register');
    const reg = require('esbuild-register/dist/node');
    reg.register();
    console.error('runner: esbuild-register registered');
    const cfg = require('./decoupla.config.ts');
    console.error('runner: required config, keys:', Object.keys(cfg));
    process.exit(0);
} catch (e) {
    console.error('runner: error', e && e.message ? e.message : e);
    process.exit(1);
}
