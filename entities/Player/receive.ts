import type { RapierRigidBody } from "@react-three/rapier";
import type { Pos2 } from "../Ball/nearestPlayer";
import type { PlayerAIState } from "./ai";
import { applySteering, spacedApproachTarget } from "./avoidance";
import { predictBallPosition, timeToNearPoint } from "./ballPrediction";
import { gaitSpeed, involvementGait } from "./gait";
import { staminaSpeedFactor } from "./stamina";

// Receiving Ball — running → ball arriving → slow down → receive → face goal.
// No teleporting: steer toward predicted ball; never snap position.

export const APPROACH_RADIUS = 14;

export const isBallArriving = (
  player: Pos2,
  ball: Pos2,
  ballVel: Pos2,
): boolean => {
  const future = predictBallPosition(ball, ballVel, 0.4);
  const toPlayerX = player.x - future.x;
  const toPlayerZ = player.z - future.z;
  const dist = Math.hypot(toPlayerX, toPlayerZ) || 1;
  const speed = Math.hypot(ballVel.x, ballVel.z);
  if (speed < 0.4) return Math.hypot(player.x - ball.x, player.z - ball.z) < APPROACH_RADIUS;
  const closing =
    (ballVel.x * (player.x - ball.x) + ballVel.z * (player.z - ball.z)) /
    (Math.hypot(player.x - ball.x, player.z - ball.z) || 1);
  return closing > 0.5 && dist < APPROACH_RADIUS;
};

/** Slow and steer toward where the ball will be — with spacing vs neighbors. */
export const approachBall = (
  body: RapierRigidBody,
  ai: PlayerAIState,
  ball: Pos2,
  ballVel: Pos2 = { x: 0, z: 0 },
  neighbors: Pos2[] = [],
  chaseSide: 1 | -1 = 1,
  drive = 0.6,
) => {
  const pos = body.translation();
  const self: Pos2 = { x: pos.x, z: pos.z };
  const t = timeToNearPoint(ball, ballVel, self);
  const predicted = predictBallPosition(ball, ballVel, Math.max(0.2, t));
  const target = spacedApproachTarget(self, predicted, neighbors, chaseSide, 0);
  const gait = involvementGait(self, predicted, drive);
  // Near pickup always ease to a jog/walk — no full sprint into the ball.
  const dist = Math.hypot(target.x - self.x, target.z - self.z);
  const eased =
    gait === "sprint" && dist < 5
      ? "run"
      : gait === "idle"
        ? "walk"
        : gait;
  const speed = gaitSpeed(eased, ai.pace, staminaSpeedFactor(ai.stamina));
  applySteering(
    body,
    { x: target.x - self.x, z: target.z - self.z },
    speed,
    neighbors,
  );
  ai.fsmState = "receive";
};

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
  const speed = gaitSpeed("walk", ai.pace, staminaSpeedFactor(ai.stamina)) * 0.55;
  body.setLinvel({ x: (dx / len) * speed, y: linvel.y, z: (dz / len) * speed }, true);
  ai.fsmState = "receive";
};
