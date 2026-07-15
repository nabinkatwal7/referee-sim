import type { RapierRigidBody } from "@react-three/rapier";
import type { Pos2 } from "../Ball/nearestPlayer";

// Collision Avoidance — steering + repulsion + path smoothing.
// Don't let players overlap.

const SEPARATION_RADIUS = 1.6; // start pushing before contact
const HARD_RADIUS = 0.85; // almost overlapping — strong shove
const REPULSION = 4.5;
const SMOOTH = 0.35; // blend toward new velocity each apply (path smoothing)
const MAX_SPEED = 7;

export type Vel2 = Pos2;

const normalize = (x: number, z: number): Pos2 => {
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
};

/** Soft/hard repulsion from neighbors (xz). */
export const repulsionForce = (
  self: Pos2,
  neighbors: Pos2[],
): Pos2 => {
  let fx = 0;
  let fz = 0;
  for (const n of neighbors) {
    const dx = self.x - n.x;
    const dz = self.z - n.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-4 || dist >= SEPARATION_RADIUS) continue;
    const dir = normalize(dx, dz);
    const w =
      dist < HARD_RADIUS
        ? REPULSION * 2.5 * (1 - dist / HARD_RADIUS)
        : REPULSION * (1 - dist / SEPARATION_RADIUS);
    fx += dir.x * w;
    fz += dir.z * w;
  }
  return { x: fx, z: fz };
};

/** Blend current velocity toward desired — cheap path smoothing. */
export const smoothVelocity = (
  current: Vel2,
  desired: Vel2,
  blend: number = SMOOTH,
): Vel2 => ({
  x: current.x + (desired.x - current.x) * blend,
  z: current.z + (desired.z - current.z) * blend,
});

/**
 * Steering toward a unit/near-unit direction at `speed`, plus repulsion,
 * then smoothed into the body linvel.
 */
export const applySteering = (
  body: RapierRigidBody,
  steer: Pos2,
  speed: number,
  neighbors: Pos2[],
) => {
  const pos = body.translation();
  const self: Pos2 = { x: pos.x, z: pos.z };
  const dir = normalize(steer.x, steer.z);
  const rep = repulsionForce(self, neighbors);

  let vx = dir.x * speed + rep.x;
  let vz = dir.z * speed + rep.z;
  const mag = Math.hypot(vx, vz);
  if (mag > MAX_SPEED) {
    vx = (vx / mag) * MAX_SPEED;
    vz = (vz / mag) * MAX_SPEED;
  }

  const cur = body.linvel();
  const smoothed = smoothVelocity({ x: cur.x, z: cur.z }, { x: vx, z: vz });
  body.setLinvel({ x: smoothed.x, y: cur.y, z: smoothed.z }, true);
};

/**
 * After all AI has written desired velocities: re-apply repulsion so even
 * freeze/wander frames don't stack players on top of each other.
 * ponytail: O(n²) over 22 — fine; spatial hash later if needed.
 */
export const resolveOverlaps = (
  bodies: (RapierRigidBody | null)[],
) => {
  const positions: (Pos2 | null)[] = bodies.map((b) => {
    if (!b) return null;
    const t = b.translation();
    return { x: t.x, z: t.z };
  });

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const self = positions[i];
    if (!body || !self) continue;

    const neighbors: Pos2[] = [];
    for (let j = 0; j < positions.length; j++) {
      if (j === i || !positions[j]) continue;
      neighbors.push(positions[j]!);
    }

    const rep = repulsionForce(self, neighbors);
    if (Math.hypot(rep.x, rep.z) < 0.05) continue;

    const cur = body.linvel();
    const desired = { x: cur.x + rep.x, z: cur.z + rep.z };
    const smoothed = smoothVelocity({ x: cur.x, z: cur.z }, desired, 0.5);
    body.setLinvel({ x: smoothed.x, y: cur.y, z: smoothed.z }, true);
  }
};
