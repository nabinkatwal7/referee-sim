import type { Pos2 } from "../Ball/nearestPlayer";

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

const nearestOpponentDist = (
  at: Pos2,
  opponents: Pos2[],
): number => {
  let best = Infinity;
  for (const o of opponents) {
    const d = Math.hypot(o.x - at.x, o.z - at.z);
    if (d < best) best = d;
  }
  return best;
};

// Opponents roughly on the pass lane (projection between from→to).
const laneRisk = (from: Pos2, to: Pos2, opponents: Pos2[]): number => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  let risk = 0;
  for (const o of opponents) {
    const ox = o.x - from.x;
    const oz = o.z - from.z;
    const along = ox * ux + oz * uz;
    if (along <= 1 || along >= len - 1) continue;
    const perp = Math.abs(ox * uz - oz * ux);
    if (perp < 3) risk += (3 - perp) / 3;
  }
  return risk;
};

export const scorePassTarget = (
  from: Pos2,
  to: Pos2,
  toIndex: number,
  attackDir: 1 | -1,
  opponents: Pos2[],
): PassCandidate => {
  const distance = Math.hypot(to.x - from.x, to.z - from.z) || 1;
  // Prefer mid-range passes; too short or too long scores down.
  const distanceScore =
    distance > MAX_PASS ? 0 : 1 - Math.abs(distance - IDEAL_PASS) / IDEAL_PASS;

  const openSpace = nearestOpponentDist(to, opponents);
  const openScore = clamp01(openSpace / 12);

  const pressure = nearestOpponentDist(from, opponents);
  const pressureScore = clamp01(pressure / 8); // freer passer → better

  const forward = (to.z - from.z) * attackDir;
  const forwardScore = clamp01((forward + 10) / 25);

  // Angle: how well the pass points toward the opponent goal line.
  const toGoal = { x: -to.x, z: attackDir * 52.5 - to.z };
  const passDir = { x: to.x - from.x, z: to.z - from.z };
  const dot =
    (passDir.x * toGoal.x + passDir.z * toGoal.z) /
    ((Math.hypot(passDir.x, passDir.z) || 1) * (Math.hypot(toGoal.x, toGoal.z) || 1));
  const angleScore = clamp01((dot + 1) / 2);

  const risk = laneRisk(from, to, opponents);
  const riskPenalty = clamp01(risk / 3);

  const score =
    distanceScore * 0.2 +
    openScore * 0.25 +
    pressureScore * 0.1 +
    forwardScore * 0.2 +
    angleScore * 0.15 -
    riskPenalty * 0.3;

  return {
    index: toIndex,
    distance,
    openSpace,
    pressure,
    forward,
    angle: angleScore,
    risk,
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
