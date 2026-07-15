// Runnable self-check: npx --yes tsx entities/Player/possessionAI.check.ts
import assert from "node:assert/strict";
import { decideAction } from "./decide";
import { pickBestPass, scorePassTarget } from "./passAI";
import { canDribble, dribbleSteer } from "./dribble";
import { canShoot, evaluateShot, generateShot } from "./shootAI";
import { isBallArriving } from "./receive";

// Pass AI: open forward teammate beats a marked backward one.
const from = { x: 0, z: 0 };
const opponents = [{ x: 2, z: -5 }]; // behind passer
const forwardOpen = scorePassTarget(from, { x: 0, z: 20 }, 1, 1, opponents);
const backwardMarked = scorePassTarget(from, { x: 0, z: -10 }, 2, 1, [{ x: 0, z: -10 }]);
assert.ok(forwardOpen.score > backwardMarked.score, "forward open pass should win");

const best = pickBestPass(
  from,
  [
    { index: 1, pos: { x: 0, z: 20 } },
    { index: 2, pos: { x: 0, z: -10 } },
  ],
  1,
  opponents,
);
assert.equal(best?.index, 1);

// Shoot: close central chance should be takeable.
const close = evaluateShot({ x: 0, z: 40 }, 1, 1, 8, { x: 2, z: 50 });
assert.equal(canShoot(close), true);
const plan = generateShot({ x: 0, z: 40 }, 1, close, { x: 2, z: 50 });
assert.ok(plan.power > 10);
assert.ok(Math.abs(plan.spin) <= 1);

const far = evaluateShot({ x: 0, z: 0 }, 1, 1, 8, null);
assert.equal(canShoot(far), false);

// Decision tree order: shoot beats pass when both viable.
const shootDecision = decideAction({
  ball: { x: 0, z: 42 },
  attackDir: 1,
  preferredFoot: 1,
  teammates: [{ index: 3, pos: { x: 10, z: 30 } }],
  opponents: [{ x: 20, z: 20 }],
  keeperPos: { x: 1, z: 52 },
});
assert.equal(shootDecision.kind, "shoot");

// Dribble when nothing special on.
assert.equal(canDribble(5), true);
assert.equal(canDribble(1), false);
const steer = dribbleSteer({ x: 0, z: 0 }, 1, [{ x: 2, z: 1 }]);
assert.ok(steer.z > 0); // still advances

// Receive: ball flying toward player counts as arriving.
assert.equal(
  isBallArriving({ x: 0, z: 10 }, { x: 0, z: 0 }, { x: 0, z: 8 }),
  true,
);
assert.equal(
  isBallArriving({ x: 0, z: 10 }, { x: 0, z: 0 }, { x: 0, z: -8 }),
  false,
);

console.log("possessionAI.check: ok");
