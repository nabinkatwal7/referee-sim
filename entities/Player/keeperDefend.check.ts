// Runnable self-check: npx --yes tsx entities/Player/keeperDefend.check.ts
import assert from "node:assert/strict";
import { chooseDefendPhase, pickMarkTarget } from "./defend";
import { createGoalkeeperAIState } from "./goalkeeper";

// Defensive AI: press when carrier is close; recover when our team has ball.
assert.equal(
  chooseDefendPhase({
    self: { x: 0, z: 0 },
    home: { x: 0, z: -20 },
    ball: { x: 2, z: 2 },
    ballVel: { x: 0, z: 0 },
    carrier: { x: 2, z: 2 },
    mark: { x: 2, z: 2 },
    attackDir: 1,
    hasBallTeam: "away",
    ownTeam: "home",
  }),
  "press",
);

assert.equal(
  chooseDefendPhase({
    self: { x: 0, z: 0 },
    home: { x: 0, z: -20 },
    ball: { x: 2, z: 2 },
    ballVel: { x: 0, z: 0 },
    carrier: { x: 1, z: 1 },
    mark: { x: 1, z: 1 },
    attackDir: 1,
    hasBallTeam: "away",
    ownTeam: "home",
  }),
  "tackle",
);

assert.equal(
  chooseDefendPhase({
    self: { x: 0, z: 0 },
    home: { x: 0, z: -20 },
    ball: { x: 0, z: 10 },
    ballVel: { x: 0, z: 0 },
    carrier: { x: 0, z: 10 },
    mark: null,
    attackDir: 1,
    hasBallTeam: "home",
    ownTeam: "home",
  }),
  "recover",
);

const mark = pickMarkTarget(
  { x: 0, z: -20 },
  [{ pos: { x: 0, z: -5 } }, { pos: { x: 10, z: 20 } }],
  1,
);
assert.ok(mark && mark.z === -5, "mark the more goal-threatening opponent");

// Keeper state machine boots idle — separate from field FSM.
const gk = createGoalkeeperAIState([0, 1, -50]);
assert.equal(gk.fsmState, "idle");
assert.equal(gk.holdTimer, 0);

console.log("keeperDefend.check: ok");
