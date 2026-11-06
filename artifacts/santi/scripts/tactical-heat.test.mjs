import assert from "node:assert/strict";
import { generateHeatmap, pyRound } from "../src/lib/tactical-heat.ts";
assert.equal(pyRound(2.5), 2); assert.equal(pyRound(3.5), 4); assert.equal(pyRound(-0.5), -0);
assert.deepEqual(generateHeatmap([]), []);
const h = generateHeatmap([{ lat: 19.432, lng: -99.14, mentions: 18 }, { lat: 19.434, lng: -99.142, mentions: 5 }, { lat: 19.407, lng: -99.152, mentions: 11 }]);
assert.equal(h.length, 2); assert.equal(h[0].count, 23); assert.equal(h[0].weight, 1); assert.equal(h[1].weight, pyRound(11 / 23, 4));
console.log("tactical-heat ok");
