import type { RapierRigidBody } from "@react-three/rapier";

const DIRECTION_CHANGE_THRESHOLD = Math.PI / 3; // 60 degrees
const MIN_SPEED_FOR_COLLISION = 2;

// Very primitive collision detector: no contact-event API, just "did the
// ball's direction change sharply between frames without us being the ones
// who kicked it." Compare against a velocity snapshot taken before this
// frame's own kicks are applied, so our own passes/shots don't register as
// collisions with themselves.
export const detectCollision = (
  ball: RapierRigidBody,
  previousVelocity: { x: number; z: number },
): boolean => {
  const v = ball.linvel();
  const prevSpeed = Math.hypot(previousVelocity.x, previousVelocity.z);
  const curSpeed = Math.hypot(v.x, v.z);
  if (prevSpeed < MIN_SPEED_FOR_COLLISION || curSpeed < MIN_SPEED_FOR_COLLISION) return false;

  const dot = (previousVelocity.x * v.x + previousVelocity.z * v.z) / (prevSpeed * curSpeed);
  const angleChange = Math.acos(Math.max(-1, Math.min(1, dot)));
  return angleChange > DIRECTION_CHANGE_THRESHOLD;
};
