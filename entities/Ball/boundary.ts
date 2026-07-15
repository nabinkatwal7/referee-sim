import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
import { PITCH_WIDTH, PITCH_LENGTH, GOAL_WIDTH } from "../../components/game/pitchDimensions";
import type { Team } from "../Player/brain";

const GOAL_MOUTH_HALF_WIDTH = GOAL_WIDTH / 2;

export type BoundaryResult =
  | { kind: "throwIn"; team: Team; position: { x: number; z: number } }
  | { kind: "corner"; team: Team; position: { x: number; z: number } };

// Ball crossed a touchline or byline: stop it and place it at the boundary
// for a restart, awarded to whichever team didn't touch it last. Simplified —
// doesn't distinguish a corner from a goal kick (whoever last touched it
// always concedes the restart), and anything through the goal mouth is left
// alone (that's a goal, handled by the shot mechanic, not here).
export const checkBoundary = (
  ball: RapierRigidBody,
  lastTouchTeam: Team | null,
): BoundaryResult | null => {
  const pos = ball.translation();
  const halfWidth = PITCH_WIDTH / 2;
  const halfLength = PITCH_LENGTH / 2;
  const awardedTeam: Team = lastTouchTeam === "A" ? "B" : "A";

  if (Math.abs(pos.x) > halfWidth) {
    const clampedX = Math.sign(pos.x) * halfWidth;
    ball.setTranslation({ x: clampedX, y: 1, z: pos.z }, true);
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return { kind: "throwIn", team: awardedTeam, position: { x: clampedX, z: pos.z } };
  }

  if (Math.abs(pos.z) > halfLength && Math.abs(pos.x) > GOAL_MOUTH_HALF_WIDTH) {
    const clampedZ = Math.sign(pos.z) * halfLength;
    ball.setTranslation({ x: pos.x, y: 1, z: clampedZ }, true);
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
    return { kind: "corner", team: awardedTeam, position: { x: pos.x, z: clampedZ } };
  }

  return null;
};
