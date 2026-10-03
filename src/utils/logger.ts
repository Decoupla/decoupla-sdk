// Simple repo-only debug logger.
// Enable by setting DECOUPLA_DEBUG=1 or DECOUPLA_DEBUG=true in your environment.
const ENABLED = (() => {
  const env = typeof process !== 'undefined' ? process.env : {};
  const v = env.DECOUPLA_DEBUG || env.DEBUG || '';
  return v === '1' || v === 'true' || v.toLowerCase() === 'yes';
})();

export function debug(...args: any[]) {
  if (!ENABLED) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function info(...args: any[]) {
  // info is user-facing; keep visible
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function warn(...args: any[]) {
  // eslint-disable-next-line no-console
  console.warn(...args);
}

export function error(...args: any[]) {
  // eslint-disable-next-line no-console
  console.error(...args);
}

export default { debug, info, warn, error };
