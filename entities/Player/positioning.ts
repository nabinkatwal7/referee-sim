import type { Pos2 } from "../Ball/nearestPlayer";
import type { TacticalParams } from "./tactics";

// Step 33 — Dynamic Positioning.
// Ball moves → formation shifts → entire team slides (like real football).

export type ShapePhase = "attack" | "defend" | "home";

export type PlayerAnchors = {
  home: Pos2;
  attack: Pos2;
  defend: Pos2;
};

const PITCH_HALF_W = 34;
const PITCH_HALF_L = 52.5;

/**
 * Live shape target for a player: blend home/attack/defend, then slide the
 * whole block with the ball (width / depth / lineHeight / compactness).
 */
export const dynamicShapeTarget = (
  anchors: PlayerAnchors,
  ball: Pos2,
  attackDir: 1 | -1,
  phase: ShapePhase,
  tactics: TacticalParams,
): Pos2 => {
  const base =
    phase === "attack" ? anchors.attack : phase === "defend" ? anchors.defend : anchors.home;

  // Lateral slide with the ball, scaled by width; compactness pulls toward center.
  const slideX =
    ball.x * (0.15 + tactics.width * 0.35) * (1 - tactics.compactness * 0.4);

  // Soft depth slide — clamp so recover never yanks the whole team to midfield.
  const alongRaw = (ball.z - anchors.home.z) * (0.04 + tactics.depth * 0.1);
  const along = Math.max(-8, Math.min(8, alongRaw));
  // Line height pushes the whole unit upfield when high.
  const linePush = attackDir * (tactics.lineHeight - 0.5) * 8;

  // Compactness shrinks spacing vs home.
  const compactX = (base.x - anchors.home.x) * (1 - tactics.compactness * 0.35);
  const compactZ = (base.z - anchors.home.z) * (1 - tactics.compactness * 0.25);

  let x = anchors.home.x + compactX + slideX;
  let z = anchors.home.z + compactZ + along + linePush;

  // Soft pitch clamp — stay on the grass.
  x = Math.max(-PITCH_HALF_W + 1, Math.min(PITCH_HALF_W - 1, x));
  z = Math.max(-PITCH_HALF_L + 2, Math.min(PITCH_HALF_L - 2, z));

  return { x, z };
};

export const shapePhaseFor = (
  ownTeamHasBall: boolean,
  opponentHasBall: boolean,
): ShapePhase => {
  if (ownTeamHasBall) return "attack";
  if (opponentHasBall) return "defend";
  return "home";
};
