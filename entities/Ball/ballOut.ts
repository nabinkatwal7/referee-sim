import type { RapierRigidBody } from "@react-three/rapier";
import {
  GOAL_WIDTH,
  PITCH_LENGTH,
  PITCH_WIDTH,
} from "../../components/game/pitchDimensions";
import type { AttackingDirection, TeamId } from "../../engine/team/Team";
import { BALL_RADIUS } from "./radius";

// Step 42 — Ball Out. Entire ball outside the field?
// Returns throw-in, corner, goal kick, or goal.

export const GOAL_HEIGHT = 2.44; // regulation crossbar

const GOAL_MOUTH_HALF = GOAL_WIDTH / 2;

export type BallOutResult =
  | { kind: "throwIn"; team: TeamId; position: { x: number; z: number } }
  | { kind: "corner"; team: TeamId; position: { x: number; z: number } }
  | { kind: "goalKick"; team: TeamId; position: { x: number; z: number } }
  | {
      kind: "goal";
      team: TeamId; // scoring team
      position: { x: number; z: number };
    };

/** Team whose own goal sits on the +z or -z byline. */
export const defendingTeamAtByline = (
  bylineSign: 1 | -1,
  homeAttackDir: AttackingDirection,
): TeamId => {
  // Home attacks +z → own goal at -z. Goal at +z belongs to home when homeAttackDir === -1.
  if (bylineSign === 1) return homeAttackDir === -1 ? "home" : "away";
  return homeAttackDir === 1 ? "home" : "away";
};

const otherTeam = (t: TeamId): TeamId => (t === "home" ? "away" : "home");

/**
 * Classify ball fully outside the pitch.
 * Does NOT mutate the ball — caller places it for the restart.
 */
export const detectBallOut = (
  ball: RapierRigidBody,
  lastTouch: TeamId | null,
  homeAttackDir: AttackingDirection,
): BallOutResult | null => {
  const pos = ball.translation();
  const r = BALL_RADIUS;
  const halfW = PITCH_WIDTH / 2;
  const halfL = PITCH_LENGTH / 2;

  // —— Goal: entire ball over goal line, between posts, under crossbar ——
  const fullyPastPlus = pos.z - r > halfL;
  const fullyPastMinus = pos.z + r < -halfL;
  if (fullyPastPlus || fullyPastMinus) {
    const byline: 1 | -1 = fullyPastPlus ? 1 : -1;
    const inMouth = Math.abs(pos.x) + r < GOAL_MOUTH_HALF;
    const underBar = pos.y + r < GOAL_HEIGHT && pos.y - r > -0.1;
    if (inMouth && underBar) {
      const defending = defendingTeamAtByline(byline, homeAttackDir);
      return {
        kind: "goal",
        team: otherTeam(defending),
        position: { x: pos.x, z: byline * halfL },
      };
    }

    // Byline outside the mouth → corner or goal kick.
    const defending = defendingTeamAtByline(byline, homeAttackDir);
    const attacking = otherTeam(defending);
    const cornerX = Math.sign(pos.x || 1) * halfW;
    const cornerZ = byline * halfL;
    // Last touch by defending team → corner to attackers; else goal kick to defenders.
    if (lastTouch === defending) {
      return {
        kind: "corner",
        team: attacking,
        position: { x: cornerX, z: cornerZ },
      };
    }
    // 6-yard-ish spot for goal kick
    const six = Math.min(5.5, halfL - 1);
    return {
      kind: "goalKick",
      team: defending,
      position: { x: 0, z: byline * (halfL - six) },
    };
  }

  // —— Touchline: entire ball past side line ——
  if (pos.x - r > halfW || pos.x + r < -halfW) {
    const side = Math.sign(pos.x) as 1 | -1;
    const awarded: TeamId =
      lastTouch === "home" ? "away" : lastTouch === "away" ? "home" : "home";
    const z = Math.max(-halfL + 1, Math.min(halfL - 1, pos.z));
    return {
      kind: "throwIn",
      team: awarded,
      position: { x: side * halfW, z },
    };
  }

  return null;
};

/** Stop ball and place for a restart spot. */
export const placeBallForRestart = (
  ball: RapierRigidBody,
  position: { x: number; z: number },
  height = 0.5,
) => {
  ball.setTranslation({ x: position.x, y: height, z: position.z }, true);
  ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
  ball.setAngvel({ x: 0, y: 0, z: 0 }, true);
};
