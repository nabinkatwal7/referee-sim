// Runnable: npx --yes tsx entities/Player/keeperDefend.check.ts
import assert from "node:assert/strict";
import { chooseDefendPhase, pickMarkTarget } from "./defend";
import { createGoalkeeperAIState } from "./goalkeeper";
import { DEFAULT_TACTICS } from "./tactics";

const anchors = {
  home: { x: 0, z: -20 },
  attack: { x: 0, z: -12 },
  defend: { x: 0, z: -24 },
};

const base = {
  anchors,
  ball: { x: 2, z: 2 },
  ballVel: { x: 0, z: 0 },
  passTarget: null as null,
  attackDir: 1 as const,
  ownTeam: "home" as const,
  role: "CM" as const,
  tactics: DEFAULT_TACTICS,
  neighbors: [] as { x: number; z: number }[],
  chaseSide: 1 as const,
};

assert.equal(
  chooseDefendPhase({
    ...base,
    self: { x: 0, z: 0 },
    carrier: { x: 2, z: 2 },
    mark: { x: 2, z: 2 },
    hasBallTeam: "away",
    allowChase: true,
    chaseRank: 0,
  }),
  "press",
);

assert.equal(
  chooseDefendPhase({
    ...base,
    self: { x: 0, z: 0 },
    carrier: { x: 1, z: 1 },
    mark: { x: 1, z: 1 },
    hasBallTeam: "away",
    allowChase: true,
    chaseRank: 0,
  }),
  "tackle",
);

assert.equal(
  chooseDefendPhase({
    ...base,
    self: { x: 0, z: 0 },
    carrier: { x: 1, z: 1 },
    mark: { x: 1, z: 1 },
    hasBallTeam: "away",
    allowChase: true,
    chaseRank: 1,
  }),
  "press",
  "support rank does not dive into tackle",
);

assert.equal(
  chooseDefendPhase({
    ...base,
    self: { x: 0, z: 0 },
    ball: { x: 0, z: 10 },
    carrier: { x: 0, z: 10 },
    mark: null,
    hasBallTeam: "home",
    allowChase: false,
    chaseRank: 0,
  }),
  "recover",
);

assert.equal(
  chooseDefendPhase({
    ...base,
    self: { x: 0, z: 0 },
    carrier: { x: 2, z: 2 },
    mark: { x: 2, z: 2 },
    hasBallTeam: "away",
    allowChase: false,
    chaseRank: 0,
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
