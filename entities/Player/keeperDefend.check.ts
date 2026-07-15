// Runnable self-check: npx --yes tsx entities/Player/keeperDefend.check.ts
import assert from "node:assert/strict";
import { chooseDefendPhase, pickMarkTarget } from "./defend";
import { createGoalkeeperAIState } from "./goalkeeper";
import { DEFAULT_TACTICS } from "./tactics";

const anchors = {
  home: { x: 0, z: -20 },
  attack: { x: 0, z: -12 },
  defend: { x: 0, z: -24 },
};

assert.equal(
  chooseDefendPhase({
    self: { x: 0, z: 0 },
    anchors,
    ball: { x: 2, z: 2 },
    ballVel: { x: 0, z: 0 },
    carrier: { x: 2, z: 2 },
    passTarget: null,
    mark: { x: 2, z: 2 },
    attackDir: 1,
    hasBallTeam: "away",
    ownTeam: "home",
    tactics: DEFAULT_TACTICS,
    neighbors: [],
    allowChase: true,
  }),
  "press",
);

assert.equal(
  chooseDefendPhase({
    self: { x: 0, z: 0 },
    anchors,
    ball: { x: 2, z: 2 },
    ballVel: { x: 0, z: 0 },
    carrier: { x: 1, z: 1 },
    passTarget: null,
    mark: { x: 1, z: 1 },
    attackDir: 1,
    hasBallTeam: "away",
    ownTeam: "home",
    tactics: DEFAULT_TACTICS,
    neighbors: [],
    allowChase: true,
  }),
  "tackle",
);

assert.equal(
  chooseDefendPhase({
    self: { x: 0, z: 0 },
    anchors,
    ball: { x: 2, z: 2 },
    ballVel: { x: 0, z: 0 },
    carrier: { x: 2, z: 2 },
    passTarget: null,
    mark: { x: 2, z: 2 },
    attackDir: 1,
    hasBallTeam: "away",
    ownTeam: "home",
    tactics: DEFAULT_TACTICS,
    neighbors: [],
    allowChase: false,
  }),
  "track",
  "non-chasers hold mark instead of swarming",
);

const mark = pickMarkTarget(
  { x: 0, z: -20 },
  [{ pos: { x: 0, z: -5 } }, { pos: { x: 10, z: 20 } }],
  1,
);
assert.ok(mark && mark.z === -5, "mark the more goal-threatening opponent");

const gk = createGoalkeeperAIState([0, 1, -50]);
assert.equal(gk.fsmState, "idle");
assert.equal(gk.holdTimer, 0);

console.log("keeperDefend.check: ok");
