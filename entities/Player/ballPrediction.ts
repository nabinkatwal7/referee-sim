import type { Pos2 } from "../Ball/nearestPlayer";

// Step 36 — Ball Prediction.
// Estimate where the ball will be so AI can run there.

const FRICTION = 0.985; // per-second-ish damp, applied per substep

/** Linear coast with light friction — good enough for chase / intercept. */
export const predictBallPosition = (
  pos: Pos2,
  vel: Pos2,
  dt: number,
): Pos2 => {
  // ponytail: no bounce/spin — upgrade if we need ricochets.
  const steps = Math.max(1, Math.ceil(dt / 0.05));
  const h = dt / steps;
  let x = pos.x;
  let z = pos.z;
  let vx = vel.x;
  let vz = vel.z;
  const damp = Math.pow(FRICTION, h);
  for (let i = 0; i < steps; i++) {
    x += vx * h;
    z += vz * h;
    vx *= damp;
    vz *= damp;
  }
  return { x, z };
};

/** Time until ball is closest to a point along its current path (approx). */
export const timeToNearPoint = (
  pos: Pos2,
  vel: Pos2,
  point: Pos2,
  maxT = 1.5,
): number => {
  const speed = Math.hypot(vel.x, vel.z);
  if (speed < 0.3) return 0;
  const toX = point.x - pos.x;
  const toZ = point.z - pos.z;
  const along = (toX * vel.x + toZ * vel.z) / (speed * speed);
  return Math.max(0, Math.min(maxT, along));
};
