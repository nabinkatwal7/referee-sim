// Runnable self-check: npx --yes tsx entities/Player/formationTactics.check.ts
import assert from "node:assert/strict";
import {
  FORMATIONS,
  FORMATION_4_3_3,
  phasePositionsForHome,
  homePositionForSlot,
} from "../formation";
import { predictBallPosition } from "./ballPrediction";
import { raycastPassLane } from "./passingLane";
import { dynamicShapeTarget } from "./positioning";
import { DEFAULT_TACTICS } from "./tactics";

for (const id of ["4-4-2", "4-3-3", "3-5-2", "5-3-2"] as const) {
  assert.equal(FORMATIONS[id].slots.length, 11, `${id} should have 11 slots`);
}

const stHome = homePositionForSlot(FORMATION_4_3_3.slots.find((s) => s.role === "ST")!, "A");
assert.ok(stHome[2] < -5, "ST starts well clear of center circle");
assert.ok(stHome[2] > -20, "ST still high up own half");

const home = homePositionForSlot({ role: "ST", x: 0, forward: 46 }, "A");
const phases = phasePositionsForHome(home, "ST", 1);
assert.ok(phases.attack[2] > phases.home[2], "attack sits higher up the pitch");
assert.ok(phases.attack[2] > 5, "attack ST pushes into opponent half");
assert.ok(phases.defend[2] < phases.home[2], "defend drops deeper");

const slid = dynamicShapeTarget(
  {
    home: { x: 0, z: -20 },
    attack: { x: 0, z: -12 },
    defend: { x: 0, z: -24 },
  },
  { x: 20, z: 0 },
  1,
  "attack",
  DEFAULT_TACTICS,
);
assert.ok(slid.x > 0, "team slides laterally with the ball");

const clear = raycastPassLane({ x: 0, z: 0 }, { x: 0, z: 20 }, [{ x: 10, z: 10 }]);
assert.equal(clear.blocked, false);
const blocked = raycastPassLane({ x: 0, z: 0 }, { x: 0, z: 20 }, [{ x: 0.5, z: 10 }]);
assert.equal(blocked.blocked, true);
assert.ok(blocked.risk > 0);

const future = predictBallPosition({ x: 0, z: 0 }, { x: 0, z: 10 }, 0.5);
assert.ok(future.z > 4 && future.z < 6, "ball coasts forward roughly vz*dt");

console.log("formationTactics.check: ok");
