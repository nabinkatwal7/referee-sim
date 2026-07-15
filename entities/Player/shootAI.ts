import type { Pos2 } from "../Ball/nearestPlayer";

// Step 29 — Shooting. Evaluate quality, then generate power / direction / spin.

export type ShotEvaluation = {
  distance: number;
  angle: number; // 0 = poor, 1 = dead-center looking at goal
  pressure: number; // nearest opponent dist
  weakFoot: number; // 0..1 (1 = strong foot)
  keeperGap: number; // 0..1 how open the near post is vs GK
  quality: number;
};

export type ShotPlan = {
  power: number;
  direction: Pos2; // unit xz
  spin: number; // -1..1 (y-axis curve)
  quality: number;
};

const GOAL_HALF_WIDTH = 3.66;
const SHOOT_RANGE = 32;
const SHOOT_THRESHOLD = 0.35;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const evaluateShot = (
  ball: Pos2,
  attackDir: 1 | -1,
  preferredFoot: 1 | -1, // +1 = right foot
  nearestOpponentDist: number,
  keeperPos: Pos2 | null,
): ShotEvaluation => {
  const goalZ = attackDir * 52.5;
  const distance = Math.hypot(ball.x, ball.z - goalZ);
  const distanceScore = distance > SHOOT_RANGE ? 0 : 1 - distance / SHOOT_RANGE;

  // Angle: how central is the look at goal mouth.
  const left = Math.atan2(-GOAL_HALF_WIDTH - ball.x, goalZ - ball.z);
  const right = Math.atan2(GOAL_HALF_WIDTH - ball.x, goalZ - ball.z);
  const mouth = Math.abs(right - left);
  const angle = clamp01(mouth / 1.2);

  const pressure = nearestOpponentDist;
  const pressureScore = clamp01(pressure / 6);

  // Weak foot: right-footed prefers the ball slightly to their right (+x when
  // attacking +z). Approximate with lateral side vs preferred foot.
  const side = Math.sign(ball.x) || 1;
  const weakFoot = side === preferredFoot ? 1 : 0.55;

  let keeperGap = 0.7;
  if (keeperPos) {
    // Aim away from keeper: gap = how far keeper is from center relative to us.
    const gkOffset = keeperPos.x;
    const openPost = gkOffset >= 0 ? -GOAL_HALF_WIDTH * 0.7 : GOAL_HALF_WIDTH * 0.7;
    const aimX = openPost;
    const clear = Math.abs(aimX - gkOffset);
    keeperGap = clamp01(clear / GOAL_HALF_WIDTH);
  }

  const quality =
    distanceScore * 0.3 +
    angle * 0.25 +
    pressureScore * 0.15 +
    weakFoot * 0.1 +
    keeperGap * 0.2;

  return { distance, angle, pressure, weakFoot, keeperGap, quality };
};

export const canShoot = (eval_: ShotEvaluation): boolean =>
  eval_.distance < SHOOT_RANGE && eval_.quality >= SHOOT_THRESHOLD;

export const generateShot = (
  ball: Pos2,
  attackDir: 1 | -1,
  eval_: ShotEvaluation,
  keeperPos: Pos2 | null,
): ShotPlan => {
  const goalZ = attackDir * 52.5;
  // Bias aim away from the keeper toward an open post.
  let aimX = 0;
  if (keeperPos) {
    aimX = keeperPos.x >= 0 ? -GOAL_HALF_WIDTH * 0.65 : GOAL_HALF_WIDTH * 0.65;
  }
  // Weak-foot: pull aim slightly toward stronger side / add spin.
  const spin = (1 - eval_.weakFoot) * (keeperPos && keeperPos.x >= 0 ? -0.6 : 0.6);

  const dx = aimX - ball.x;
  const dz = goalZ - ball.z;
  const len = Math.hypot(dx, dz) || 1;
  // Lateral spin component baked into direction a touch.
  const direction = {
    x: dx / len + spin * 0.08,
    z: dz / len,
  };
  const dLen = Math.hypot(direction.x, direction.z) || 1;
  direction.x /= dLen;
  direction.z /= dLen;

  // Closer = less power needed; low quality → softer / more floaty.
  const power = 10 + (1 - eval_.distance / SHOOT_RANGE) * 10 + eval_.quality * 4;

  return { power, direction, spin, quality: eval_.quality };
};

export { SHOOT_RANGE, SHOOT_THRESHOLD };
