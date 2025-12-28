import { createClient } from "../src";

const API_TOKEN = process.env.DECOUPLA_API_TOKEN || "";
const WORKSPACE = process.env.DECOUPLA_WORKSPACE || "";

if (!API_TOKEN || !WORKSPACE) {
    console.error('Missing DECOUPLA_API_TOKEN or DECOUPLA_WORKSPACE');
    process.exit(1);
}

const client = createClient({ apiToken: API_TOKEN, workspace: WORKSPACE });

async function run() {
    const inspect = await client.inspect();
    const ct = inspect.data.content_types.find((c: any) => (c.slug || c.id) === 'level_one');
    if (!ct) {
        console.error('level_one not found');
        process.exit(1);
    }

    const entries = await fetch(`https://api.decoupla.com/public/api/1.0/workspace/${WORKSPACE}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({ op_type: 'get_entries', type: 'level_one', limit: 1 }),
    });

    const entriesJson = await entries.json().catch(() => null) as any;
    console.log('get_entries response:', JSON.stringify(entriesJson, null, 2));
    const id = entriesJson?.data?.[0]?.id;
    if (!id) {
        console.error('no id found');
        process.exit(1);
    }

    const candidates = [
        ['Child'],
        [['Child', ['Child']]],
        ['Child', ['Child', ['Child']]],
        [['Child', [['Child', ['Child']]]]],
    ];

    for (const p of candidates) {
        const resp = await fetch(`https://api.decoupla.com/public/api/1.0/workspace/${WORKSPACE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify({ op_type: 'get_entry', type: 'level_one', entry_id: id, preload: p }),
        });
        const text = await resp.text();
        console.log('Preload:', JSON.stringify(p));
        console.log('Response:', text);
        console.log('---');
    }
}

run().catch(err => { console.error(err); process.exit(1); });
