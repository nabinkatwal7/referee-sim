import type { Pos2 } from "../Ball/nearestPlayer";
import { raycastPassLane } from "./passingLane";

// Step 27 — Passing AI. Each teammate gets a score; highest wins.

export type PassCandidate = {
  index: number;
  distance: number;
  openSpace: number;
  pressure: number;
  forward: number;
  angle: number;
  risk: number;
  score: number; // expected value
};

const IDEAL_PASS = 18;
const MAX_PASS = 40;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const nearestOpponentDist = (at: Pos2, opponents: Pos2[]): number => {
  let best = Infinity;
  for (const o of opponents) {
    const d = Math.hypot(o.x - at.x, o.z - at.z);
    if (d < best) best = d;
  }
  return best;
};

export const scorePassTarget = (
  from: Pos2,
  to: Pos2,
  toIndex: number,
  attackDir: 1 | -1,
  opponents: Pos2[],
): PassCandidate => {
  const distance = Math.hypot(to.x - from.x, to.z - from.z) || 1;
  const distanceScore =
    distance > MAX_PASS ? 0 : 1 - Math.abs(distance - IDEAL_PASS) / IDEAL_PASS;

  const openSpace = nearestOpponentDist(to, opponents);
  const openScore = clamp01(openSpace / 12);

  const pressure = nearestOpponentDist(from, opponents);
  const pressureScore = clamp01(pressure / 8);

  const forward = (to.z - from.z) * attackDir;
  const forwardScore = clamp01((forward + 10) / 25);

  const toGoal = { x: -to.x, z: attackDir * 52.5 - to.z };
  const passDir = { x: to.x - from.x, z: to.z - from.z };
  const dot =
    (passDir.x * toGoal.x + passDir.z * toGoal.z) /
    ((Math.hypot(passDir.x, passDir.z) || 1) * (Math.hypot(toGoal.x, toGoal.z) || 1));
  const angleScore = clamp01((dot + 1) / 2);

  // Step 35 — raycast lane for risk.
  const lane = raycastPassLane(from, to, opponents);
  const riskPenalty = clamp01(lane.risk / 2.5);

  const score =
    distanceScore * 0.2 +
    openScore * 0.25 +
    pressureScore * 0.1 +
    forwardScore * 0.2 +
    angleScore * 0.15 -
    riskPenalty * 0.35;

  return {
    index: toIndex,
    distance,
    openSpace,
    pressure,
    forward,
    angle: angleScore,
    risk: lane.risk,
    score,
  };
};

export const pickBestPass = (
  from: Pos2,
  teammates: { index: number; pos: Pos2 }[],
  attackDir: 1 | -1,
  opponents: Pos2[],
): PassCandidate | null => {
  let best: PassCandidate | null = null;
  for (const t of teammates) {
    const c = scorePassTarget(from, t.pos, t.index, attackDir, opponents);
    if (!best || c.score > best.score) best = c;
  }
  return best;
};

export const PASS_THRESHOLD = 0.55;
