import type { Pos2 } from "../Ball/nearestPlayer";
import { canDribble } from "./dribble";
import { PASS_THRESHOLD, pickBestPass, type PassCandidate } from "./passAI";
import { canShoot, evaluateShot, generateShot, type ShotPlan } from "./shootAI";

// Step 26 — Decision Tree.
// Can shoot? → Can pass? → Can dribble? → Move

export type Decision =
  | { kind: "shoot"; plan: ShotPlan }
  | { kind: "pass"; target: PassCandidate }
  | { kind: "dribble" }
  | { kind: "move" };

export type DecideInput = {
  ball: Pos2;
  attackDir: 1 | -1;
  preferredFoot: 1 | -1;
  teammates: { index: number; pos: Pos2 }[];
  opponents: Pos2[];
  keeperPos: Pos2 | null;
};

export const decideAction = (input: DecideInput): Decision => {
  const { ball, attackDir, preferredFoot, teammates, opponents, keeperPos } = input;

  let nearestOpp = Infinity;
  for (const o of opponents) {
    const d = Math.hypot(o.x - ball.x, o.z - ball.z);
    if (d < nearestOpp) nearestOpp = d;
  }

  const shotEval = evaluateShot(ball, attackDir, preferredFoot, nearestOpp, keeperPos);
  if (canShoot(shotEval)) {
    return { kind: "shoot", plan: generateShot(ball, attackDir, shotEval, keeperPos) };
  }

  const bestPass = pickBestPass(ball, teammates, attackDir, opponents);
  if (bestPass && bestPass.score >= PASS_THRESHOLD) {
    return { kind: "pass", target: bestPass };
  }

  if (canDribble(nearestOpp)) return { kind: "dribble" };
  return { kind: "move" };
};
