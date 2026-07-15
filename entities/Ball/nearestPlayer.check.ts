// Runnable self-check: npx --yes tsx entities/Ball/nearestPlayer.check.ts
import assert from "node:assert/strict";
import { canReceive, findNearestPlayer, PICKUP_RADIUS, SETTLE_SPEED } from "./nearestPlayer";

const positions: ({ x: number; z: number } | null)[] = [
  { x: 10, z: 0 },
  { x: 2, z: 0 },
  null,
  { x: 5, z: 0 },
];

const nearest = findNearestPlayer({ x: 0, z: 0 }, positions.length, (i) => positions[i]!);
assert.equal(nearest?.index, 1);
assert.ok(nearest && Math.abs(nearest.dist - 2) < 1e-9);

assert.equal(canReceive(SETTLE_SPEED - 0.1, PICKUP_RADIUS - 0.1), true);
assert.equal(canReceive(SETTLE_SPEED, 1), false);
assert.equal(canReceive(0, PICKUP_RADIUS), false);

const none = findNearestPlayer({ x: 0, z: 0 }, positions.length, (i) => positions[i]!, 1);
assert.equal(none, null);

console.log("nearestPlayer.check: ok");
