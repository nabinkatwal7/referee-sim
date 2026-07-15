import type { Pos2 } from "../Ball/nearestPlayer";
import { closestContact, isLegOrFoot, type BodyPart } from "./contact";

// Step 48 — Tackles.
// Every tackle stores speed, angle, force, ballTouched?, legTouched?

export type TackleMetrics = {
  speed: number; // challenger ground speed
  angle: number; // radians between tackle direction and ball→victim line
  force: number; // relative closing speed
  ballTouched: boolean;
  legTouched: boolean;
  contactPart: BodyPart;
  victimPart: BodyPart;
};

export const measureTackle = (
  challengerPos: Pos2,
  challengerVel: Pos2,
  victimPos: Pos2,
  victimVel: Pos2,
  ballPos: Pos2,
): TackleMetrics => {
  const speed = Math.hypot(challengerVel.x, challengerVel.z);
  const relVx = challengerVel.x - victimVel.x;
  const relVz = challengerVel.z - victimVel.z;
  const force = Math.hypot(relVx, relVz);

  const toVictimX = victimPos.x - challengerPos.x;
  const toVictimZ = victimPos.z - challengerPos.z;
  const toBallX = ballPos.x - challengerPos.x;
  const toBallZ = ballPos.z - challengerPos.z;
  const tackleLen = Math.hypot(toVictimX, toVictimZ) || 1;
  const ballLen = Math.hypot(toBallX, toBallZ) || 1;
  const cos =
    (toVictimX * toBallX + toVictimZ * toBallZ) / (tackleLen * ballLen);
  const angle = Math.acos(Math.max(-1, Math.min(1, cos)));

  const contact = closestContact(
    challengerPos.x,
    challengerPos.z,
    victimPos.x,
    victimPos.z,
  );

  const ballDist = Math.hypot(
    ballPos.x - (challengerPos.x + victimPos.x) / 2,
    ballPos.z - (challengerPos.z + victimPos.z) / 2,
  );

  return {
    speed,
    angle,
    force,
    ballTouched: ballDist < 1.4,
    legTouched: isLegOrFoot(contact.partA) || isLegOrFoot(contact.partB),
    contactPart: contact.partA,
    victimPart: contact.partB,
  };
};
