// Runnable: npx --yes tsx entities/Player/gait.check.ts
import assert from "node:assert/strict";
import {
  gaitSpeed,
  pressGait,
  recoverGait,
  roleDrive,
  trackGait,
} from "./gait";

assert.ok(roleDrive("CB") < roleDrive("ST"), "strikers push harder than CBs");
assert.ok(roleDrive("LW") > roleDrive("CDM"));

const cbRecover = recoverGait({ x: 0, z: 0 }, { x: 0, z: 6 }, "CB", false);
assert.ok(cbRecover === "walk" || cbRecover === "jog", `CB short recover is calm, got ${cbRecover}`);

const stRecover = recoverGait({ x: 0, z: 0 }, { x: 0, z: 20 }, "ST", true);
assert.ok(stRecover === "run" || stRecover === "jog", `ST long attack recover can run, got ${stRecover}`);

const firstPress = pressGait({ x: 0, z: 0 }, { x: 0, z: 15 }, 0, "CM");
assert.equal(firstPress, "sprint");

const cover = pressGait({ x: 0, z: 0 }, { x: 0, z: 15 }, 1, "CM");
assert.ok(cover === "jog" || cover === "run", `cover should not max sprint, got ${cover}`);

const mark = trackGait({ x: 0, z: 0 }, { x: 0, z: 3 }, "CB");
assert.ok(mark === "walk" || mark === "idle", `tight mark is walk/jockey, got ${mark}`);

assert.ok(gaitSpeed("sprint") > gaitSpeed("run"));
assert.ok(gaitSpeed("run") > gaitSpeed("jog"));
assert.ok(gaitSpeed("jog") > gaitSpeed("walk"));

console.log("gait.check: ok");
