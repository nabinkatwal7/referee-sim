import type { RapierRigidBody } from "@react-three/rapier";
import type { Pos2 } from "../Ball/nearestPlayer";
import type { PlayerAIState } from "./ai";

// Receiving Ball — running → ball arriving → slow down → receive → face goal.
// No teleporting: steer toward the ball and decelerate; never snap position.

export const APPROACH_RADIUS = 14;
const APPROACH_SPEED = 3.2;
const RECEIVE_SPEED = 1.6;

export const isBallArriving = (
  player: Pos2,
  ball: Pos2,
  ballVel: Pos2,
): boolean => {
  const toPlayerX = player.x - ball.x;
  const toPlayerZ = player.z - ball.z;
  const dist = Math.hypot(toPlayerX, toPlayerZ) || 1;
  const speed = Math.hypot(ballVel.x, ballVel.z);
  if (speed < 0.4) return dist < APPROACH_RADIUS; // settled nearby counts
  // Closing if velocity points toward the player.
  const closing = (ballVel.x * toPlayerX + ballVel.z * toPlayerZ) / dist;
  return closing > 0.5 && dist < APPROACH_RADIUS;
};

/** Slow and steer toward the ball. Does not change translation (no teleport). */
export const approachBall = (
  body: RapierRigidBody,
  ai: PlayerAIState,
  ball: Pos2,
) => {
  const pos = body.translation();
  const dx = ball.x - pos.x;
  const dz = ball.z - pos.z;
  const dist = Math.hypot(dx, dz) || 1;
  const speed = dist > 4 ? APPROACH_SPEED : RECEIVE_SPEED;
  const linvel = body.linvel();
  body.setLinvel({ x: (dx / dist) * speed, y: linvel.y, z: (dz / dist) * speed }, true);
  ai.fsmState = "receive";
};

/** After taking the ball: face opponent goal (steer orientation via velocity). */
export const faceGoal = (
  body: RapierRigidBody,
  ai: PlayerAIState,
  attackDir: 1 | -1,
) => {
  const pos = body.translation();
  const dx = -pos.x * 0.2;
  const dz = attackDir;
  const len = Math.hypot(dx, dz) || 1;
  const linvel = body.linvel();
  // Soft turn — keep mostly planted while receiving.
  body.setLinvel({ x: (dx / len) * 0.8, y: linvel.y, z: (dz / len) * 0.8 }, true);
  ai.fsmState = "receive";
};
