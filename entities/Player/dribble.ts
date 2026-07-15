import type { RapierRigidBody } from "@react-three/rapier";
import type { Pos2 } from "../Ball/nearestPlayer";
import { applySteering } from "./avoidance";

// Step 28 — Dribbling. Simple steering: ball slightly ahead, avoid defenders, move.

const DRIBBLE_SPEED = 4.5;
const AHEAD = 0.85;
const AVOID_RADIUS = 6;
const AVOID_STRENGTH = 1.2;

const normalize = (x: number, z: number): Pos2 => {
  const len = Math.hypot(x, z) || 1;
  return { x: x / len, z: z / len };
};

export const dribbleSteer = (
  self: Pos2,
  attackDir: 1 | -1,
  defenders: Pos2[],
): Pos2 => {
  let dx = -self.x * 0.15;
  let dz = attackDir;

  for (const d of defenders) {
    const ox = self.x - d.x;
    const oz = self.z - d.z;
    const dist = Math.hypot(ox, oz);
    if (dist < 0.1 || dist > AVOID_RADIUS) continue;
    const w = ((AVOID_RADIUS - dist) / AVOID_RADIUS) * AVOID_STRENGTH;
    dx += (ox / dist) * w;
    dz += (oz / dist) * w;
  }

  return normalize(dx, dz);
};

export const canDribble = (nearestDefenderDist: number): boolean =>
  nearestDefenderDist > 2.5;

export const moveSteer = (self: Pos2, attackDir: 1 | -1): Pos2 =>
  normalize(-self.x * 0.1, attackDir);

export const applySteer = (
  body: RapierRigidBody,
  steer: Pos2,
  speed: number = DRIBBLE_SPEED,
  neighbors: Pos2[] = [],
) => {
  applySteering(body, steer, speed, neighbors);
};

export const carryBallAhead = (
  ball: RapierRigidBody,
  player: Pos2,
  facing: Pos2,
  playerVel: Pos2,
  ahead: number = AHEAD,
) => {
  const face = normalize(facing.x, facing.z);
  ball.setTranslation(
    { x: player.x + face.x * ahead, y: 0.5, z: player.z + face.z * ahead },
    true,
  );
  ball.setLinvel({ x: playerVel.x, y: 0, z: playerVel.z }, true);
};

export { DRIBBLE_SPEED };
