import type { RapierRigidBody } from "@react-three/rapier";
import type { Pos2 } from "../Ball/nearestPlayer";

// Collision Avoidance — soft characters (no player-player physics).
// Steering + repulsion + hard positional unstick.

const SEPARATION_RADIUS = 2.2;
const HARD_RADIUS = 1.05;
const REPULSION = 5.5;
const SMOOTH = 0.22; // gentler blend — less sticky oscillation
const MAX_SPEED = 7;

export type Vel2 = Pos2;

const normalize = (x: number, z: number): Pos2 => {
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
};

/** Soft/hard repulsion from neighbors (xz). */
export const repulsionForce = (self: Pos2, neighbors: Pos2[]): Pos2 => {
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
        ? REPULSION * 3.2 * (1 - dist / HARD_RADIUS)
        : REPULSION * (1 - dist / SEPARATION_RADIUS);
    fx += dir.x * w;
    fz += dir.z * w;
  }
  return { x: fx, z: fz };
};

/**
 * Aim at `focus`, but don't all share the same point.
 * rank 0 = first man (slight hold-back), rank 1+ = angled support run.
 * side chooses left/right lane.
 */
export const spacedApproachTarget = (
  self: Pos2,
  focus: Pos2,
  neighbors: Pos2[],
  side: 1 | -1,
  rank: number,
): Pos2 => {
  const dx = focus.x - self.x;
  const dz = focus.z - self.z;
  const len = Math.hypot(dx, dz) || 1;
  const fx = dx / len;
  const fz = dz / len;
  const px = -fz;
  const pz = fx;

  // Stay off the exact focus so two players don't occupy one spot.
  const holdBack = rank === 0 ? 1.1 : 2.4;
  const lane = (rank === 0 ? 0.35 : 2.2 + rank * 0.6) * side;

  let tx = focus.x - fx * holdBack + px * lane;
  let tz = focus.z - fz * holdBack + pz * lane;

  // If someone sits between us and the focus, bias further sideways.
  for (const n of neighbors) {
    const toN = Math.hypot(n.x - self.x, n.z - self.z);
    if (toN < 0.05 || toN > 5) continue;
    const along = ((n.x - self.x) * fx + (n.z - self.z) * fz) / toN;
    const perp = (n.x - self.x) * px + (n.z - self.z) * pz;
    if (along > 0.2 && Math.abs(perp) < 1.4) {
      tx += px * side * 1.6;
      tz += pz * side * 1.6;
    }
  }

  return { x: tx, z: tz };
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
 * Steering toward a direction at `speed`, plus repulsion,
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
 * After AI writes velocities: shove any stacked players apart in position
 * (physics no longer separates them).
 */
export const resolveOverlaps = (bodies: (RapierRigidBody | null)[]) => {
  const positions: (Pos2 | null)[] = bodies.map((b) => {
    if (!b) return null;
    const t = b.translation();
    return { x: t.x, z: t.z };
  });

  // Pairwise hard unstick — push both halfway.
  for (let i = 0; i < bodies.length; i++) {
    const a = positions[i];
    if (!a || !bodies[i]) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = positions[j];
      if (!b || !bodies[j]) continue;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= HARD_RADIUS || dist < 1e-5) continue;
      // Soft unstick — full correction looked like vibrating players.
      const push = (HARD_RADIUS - dist) * 0.28;
      const dir = normalize(dx, dz);
      a.x += dir.x * push;
      a.z += dir.z * push;
      b.x -= dir.x * push;
      b.z -= dir.z * push;
      positions[i] = a;
      positions[j] = b;
    }
  }

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const self = positions[i];
    if (!body || !self) continue;

    const t = body.translation();
    if (Math.hypot(self.x - t.x, self.z - t.z) > 0.008) {
      body.setTranslation({ x: self.x, y: t.y, z: self.z }, true);
    }

    const neighbors: Pos2[] = [];
    for (let j = 0; j < positions.length; j++) {
      if (j === i || !positions[j]) continue;
      neighbors.push(positions[j]!);
    }

    const rep = repulsionForce(self, neighbors);
    if (Math.hypot(rep.x, rep.z) < 0.08) continue;

    const cur = body.linvel();
    const desired = { x: cur.x + rep.x * 0.65, z: cur.z + rep.z * 0.65 };
    const smoothed = smoothVelocity({ x: cur.x, z: cur.z }, desired, 0.2);
    body.setLinvel({ x: smoothed.x, y: cur.y, z: smoothed.z }, true);
  }
};

export { SEPARATION_RADIUS, HARD_RADIUS };
