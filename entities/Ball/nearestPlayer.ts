// Step 24 — Nearest Player Search.
// Every frame: ball → nearest player → distance → can receive?

export const PICKUP_RADIUS = 6; // generous — players wander, not chase the ball
export const SETTLE_SPEED = 1.5; // ball must be slower than this to be "received"

export type Pos2 = { x: number; z: number };

export type NearestPlayer = {
  index: number;
  dist: number;
};

// ponytail: O(n) scan over the full roster (22). Ceiling is fine at this
// scale — upgrade to a spatial hash / grid when player count or query rate
// actually hurts (see Step 24 "Use spatial partitioning later").
export const findNearestPlayer = (
  ball: Pos2,
  count: number,
  positionAt: (index: number) => Pos2 | null,
  maxDist: number = Infinity,
): NearestPlayer | null => {
  let nearest: number | null = null;
  let nearestDist = maxDist;

  for (let i = 0; i < count; i++) {
    const p = positionAt(i);
    if (!p) continue;
    const dist = Math.hypot(p.x - ball.x, p.z - ball.z);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = i;
    }
  }

  return nearest === null ? null : { index: nearest, dist: nearestDist };
};

export const canReceive = (ballSpeed: number, dist: number): boolean =>
  ballSpeed < SETTLE_SPEED && dist < PICKUP_RADIUS;
