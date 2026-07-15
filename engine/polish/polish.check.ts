// Runnable self-check: npx --yes tsx engine/polish/polish.check.ts
import assert from "node:assert/strict";
import {
  applyRainPhysics,
  createWeather,
  stepWeather,
} from "./weather";
import { createCrowd, reactCrowd } from "./crowd";
import {
  createCommentary,
  pushCommentary,
  stepCommentary,
} from "./commentary";
import { beginProtest, createProtest, stepProtest } from "./protests";
import { createTimeWaste, stepTimeWaste } from "./timeWasting";
import { createInjuries, rollInjury } from "./injuries";
import { completeSubstitution, createSubstitutions, queueSubstitution } from "./substitutions";
import { createManagers, reactManagers } from "./managers";
import { createFourthOfficial, showAddedTime } from "./fourthOfficial";
import { beginBroadcastReplay, createBroadcast } from "./broadcast";
import { bumpStat, createStatistics } from "./statistics";
import { DIFFICULTY_PARAMS } from "./difficulty";
import {
  createPolish,
  onPolishCard,
  onPolishEvent,
  polishHud,
  stepPolish,
} from "./index";

const wet = applyRainPhysics({ x: 10, y: 0, z: 10 }, 0.8, 0.1);
assert.ok(Math.hypot(wet.x, wet.z) < Math.hypot(10, 10), "rain damps ball");

let weather = createWeather(0);
weather = stepWeather({ ...weather, nextChangeAt: 0 }, 1);
assert.ok(["clear", "cloudy", "rain", "storm"].includes(weather.kind));

let crowd = createCrowd();
crowd = reactCrowd(crowd, { kind: "goal", home: true });
assert.ok(crowd.volume > 0.35 && crowd.mood === "celebrating");

let com = pushCommentary(createCommentary(), "goal", 10);
assert.ok(com.current?.text);
com = stepCommentary(com, 5);
assert.equal(com.current, null);

let protest = beginProtest(0, 4, 0.8);
assert.ok(protest.active);
protest = stepProtest(protest, 10);
assert.ok(!protest.active);

let waste = createTimeWaste();
waste = stepTimeWaste(waste, 9, true);
assert.ok(waste.flagged);

const inj = rollInjury(createInjuries(), 3, 0.95, 1);
assert.ok(inj.list.length === 1 || inj.list.length === 0); // RNG — just don't throw

let subs = createSubstitutions(3);
const queued = queueSubstitution(subs, {
  team: "home",
  off: 1,
  on: 12,
  at: 1,
  reason: "tactical",
});
assert.ok(queued);
subs = completeSubstitution(queued!);
assert.equal(subs.used.home, 1);

const mgr = reactManagers(createManagers(), { kind: "goal", scoring: "away" });
assert.equal(mgr.away, "pleased");

const fourth = showAddedTime(createFourthOfficial(), 3);
assert.equal(fourth.board.message, "+3");

const bc = beginBroadcastReplay(createBroadcast(), 5, "goalLine");
assert.ok(bc.label?.includes("goalLine"));

assert.equal(bumpStat(createStatistics(), "passes", 2).passes, 2);
assert.ok(DIFFICULTY_PARAMS.hard.pressingMul > DIFFICULTY_PARAMS.easy.pressingMul);

let polish = createPolish("normal");
polish = onPolishEvent(polish, { kind: "kickoff", at: 0 });
assert.ok(polish.commentary.current);
polish = onPolishCard(polish, { playerIndex: 7, type: "yellow" }, 12, "away");
assert.ok(polish.protest.active);
assert.ok(polish.statistics.cards >= 1);

const stepped = stepPolish(polish, 20, 0.1, {
  restartActive: false,
  scoreDiff: 1,
  addedMinutes: 2,
});
assert.equal(stepped.polish.fourth.board.addedMinutes, 2);
assert.ok(polishHud(stepped.polish).difficulty === "normal");

console.log("polish.check: ok");
