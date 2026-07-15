// Runnable: npx --yes tsx entities/Player/staminaClock.check.ts
import assert from "node:assert/strict";
import { repulsionForce, smoothVelocity } from "./avoidance";
import {
  createStamina,
  staminaDecisionLag,
  staminaPowerFactor,
  staminaSpeedFactor,
  stepStamina,
} from "./stamina";
import {
  formatMatchClock,
  playToDisplay,
  snapshotClock,
} from "../../engine/match/MatchClock";

const s = createStamina();
assert.equal(s.value, 1);
stepStamina(s, 6, 2); // sprint 2s
assert.ok(s.value < 1);
assert.ok(staminaSpeedFactor(s) < 1);
assert.ok(staminaPowerFactor(s) <= 1);
assert.ok(staminaDecisionLag(s) >= 1);

const rep = repulsionForce({ x: 0, z: 0 }, [{ x: 0.5, z: 0 }]);
assert.ok(rep.x < 0, "repulsion pushes away from neighbor");

const sm = smoothVelocity({ x: 0, z: 0 }, { x: 10, z: 0 }, 0.5);
assert.equal(sm.x, 5);

const mid = playToDisplay(45, false); // half of 90s half → ~22:30
assert.ok(mid.minute >= 20 && mid.minute <= 23);

const added = formatMatchClock(45, 0, true, 45, 90); // 90 display-secs into stoppage → +1:30
assert.ok(added.startsWith("45+"));

const snap = snapshotClock({
  period: "first",
  halfPlaySeconds: 0,
  halfIsSecond: false,
  addedTime: 0,
  inAddedTime: false,
  addedElapsed: 0,
});
assert.equal(snap.display, "00:00");
assert.equal(snap.periodLabel, "1H");

console.log("staminaClock.check: ok");
