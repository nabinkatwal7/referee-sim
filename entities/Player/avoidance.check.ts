// Runnable self-check: npx --yes tsx entities/Player/avoidance.check.ts
import assert from "node:assert/strict";
import { repulsionForce, spacedApproachTarget } from "./avoidance";

const self = { x: 0, z: 0 };
const focus = { x: 0, z: 10 };

const direct = spacedApproachTarget(self, focus, [], 1, 0);
const support = spacedApproachTarget(self, focus, [], -1, 1);
assert.ok(Math.abs(direct.x) < Math.abs(support.x) || Math.abs(support.x) > 0.5);
assert.ok(direct.z < 10, "first man holds short of the exact focus");
assert.ok(support.z < direct.z || Math.abs(support.x) > Math.abs(direct.x));

const stacked = repulsionForce({ x: 0, z: 0 }, [{ x: 0.4, z: 0 }]);
assert.ok(stacked.x < 0, "repulsion pushes away from neighbor");
assert.ok(Math.abs(stacked.x) > 2, "hard overlap gets a strong shove");

const far = repulsionForce({ x: 0, z: 0 }, [{ x: 5, z: 0 }]);
assert.equal(far.x, 0);
assert.equal(far.z, 0);

console.log("avoidance.check: ok");
