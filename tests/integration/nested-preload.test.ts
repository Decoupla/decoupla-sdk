import { describe, it, expect } from "bun:test";
import { createClient } from "../../src";
import { LevelOneContentType, LevelTwoContentType, LevelThreeContentType } from "../decoupla.config";

const API_TOKEN = process.env.DECOUPLA_API_TOKEN || "";
const WORKSPACE = process.env.DECOUPLA_WORKSPACE || "";

if (!API_TOKEN || !WORKSPACE) {
    console.error('Missing DECOUPLA_API_TOKEN or DECOUPLA_WORKSPACE');
    process.exit(1);
}

describe("Nested preload support", () => {
    const client = createClient({ apiToken: API_TOKEN, workspace: WORKSPACE });
    it("creates a 3-level chain and preloads all 3 levels via nested-array preload", async () => {
        // No provisioning required here; test uses existing test fixtures.

        // Create level 3 -> level 2 -> level 1
        const l3 = await client.createEntry(LevelThreeContentType, { Title: 'L3' }, true);
        expect(l3.id).toBeDefined();

        const l2 = await client.createEntry(LevelTwoContentType, { Title: 'L2', Child: l3.id }, true);
        expect(l2.id).toBeDefined();

        const l1 = await client.createEntry(LevelOneContentType, { Title: 'L1', Child: l2.id }, true);
        expect(l1.id).toBeDefined();

        // Use getEntries (list) which the backend returns with nested preload expansion
        // Nested-array grammar for L1 -> Child -> Child should be: [['Child', ['Child']]]

        // Request nested 3-level preload and assert expansion immediately.
        const list = await client.getEntries(LevelOneContentType, { filters: {}, preload: [['Child', ['Child']]], limit: 1 });
        expect(list.data.length).toBeGreaterThanOrEqual(1);
        const first = list.data[0]

        // Validate nested expansion exists: l1.child (object) -> l2.child (object) -> l3
        const second = first?.child;
        expect(typeof second !== 'string').toBe(true);

        const third = second?.child;
        expect(typeof third !== 'string').toBe(true);

        // Require that level-2 and level-3 are expanded with title
        if (!second) throw new Error('expected second to be present');
        if (!third) throw new Error('expected third to be present');

        expect(second.title).toBeDefined();
        expect(third?.title).toBeDefined();
    });
});
