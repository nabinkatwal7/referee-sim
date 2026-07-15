// Runnable: npx --yes tsx entities/Ball/rules.check.ts
import assert from "node:assert/strict";
import { defendingTeamAtByline, GOAL_HEIGHT } from "./ballOut";
import { createTouchLog, recordBallTouch, lastTouchTeam } from "./touch";
import { BALL_RADIUS } from "./radius";

assert.ok(BALL_RADIUS > 0);
assert.ok(GOAL_HEIGHT > 2);

assert.equal(defendingTeamAtByline(1, 1), "away"); // home attacks +z → away goal at +z
assert.equal(defendingTeamAtByline(-1, 1), "home");
assert.equal(defendingTeamAtByline(1, -1), "home");

const log = createTouchLog();
recordBallTouch(log, {
  playerIndex: 3,
  team: "home",
  role: "ST",
  position: { x: 1, z: 2 },
  at: 12,
});
recordBallTouch(log, {
  playerIndex: 14,
  team: "away",
  role: "CB",
  position: { x: 2, z: 3 },
  at: 13,
});
assert.equal(lastTouchTeam(log), "away");
assert.equal(log.previous?.team, "home");
assert.equal(log.last?.position.z, 3);

console.log("rules.check: ok");
