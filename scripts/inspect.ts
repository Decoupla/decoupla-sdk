import { createClient } from "../src";

const API_TOKEN = process.env.DECOUPLA_API_TOKEN;
const WORKSPACE = process.env.DECOUPLA_WORKSPACE;

if (!API_TOKEN || !WORKSPACE) {
  console.error('Set DECOUPLA_API_TOKEN and DECOUPLA_WORKSPACE env vars');
  process.exit(1);
}

(async () => {
  try {
    const client = createClient({ apiToken: API_TOKEN, workspace: WORKSPACE });
    const res = await client.inspect();
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Inspect failed:', err);
    process.exit(1);
  }
})();
