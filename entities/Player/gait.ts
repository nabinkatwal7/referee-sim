import type { Role } from "../formation";
import type { Pos2 } from "../Ball/nearestPlayer";

// Movement intensity — real matches mix walking CBs, jogging shape,
// pressing midfielders, and full sprints. One speed for everyone looks wrong.

export type Gait = "idle" | "walk" | "jog" | "run" | "sprint";

/** Baseline m/s by gait (before pace × stamina). */
export const GAIT_SPEED: Record<Gait, number> = {
  idle: 0,
  walk: 1.55,
  jog: 2.75,
  run: 4.35,
  sprint: 6.15,
};

/** Role bias toward aggressive movement (0..1). */
export const ROLE_DRIVE: Partial<Record<Role, number>> = {
  GK: 0.15,
  CB: 0.25,
  LB: 0.45,
  RB: 0.45,
  LWB: 0.55,
  RWB: 0.55,
  CDM: 0.5,
  CM: 0.55,
  CAM: 0.65,
  LM: 0.6,
  RM: 0.6,
  LW: 0.75,
  RW: 0.75,
  ST: 0.7,
};

export const roleDrive = (role: Role): number => ROLE_DRIVE[role] ?? 0.5;

/** Stable per-player fingerprint so two CMs don't clone each other. */
export const createPace = (): number => 0.88 + Math.random() * 0.24;

export const gaitSpeed = (gait: Gait, pace = 1, staminaMul = 1): number =>
  GAIT_SPEED[gait] * pace * staminaMul;

/**
 * How urgently should this player move toward the ball / shape?
 * Far from the action → walk. Involved → jog/run/sprint.
 */
export const involvementGait = (
  self: Pos2,
  focus: Pos2,
  drive: number,
): Gait => {
  const dist = Math.hypot(focus.x - self.x, focus.z - self.z);
  if (dist < 1.2) return "idle";
  if (dist < 4) return drive > 0.55 ? "jog" : "walk";
  if (dist < 10) return drive > 0.45 ? "run" : "jog";
  if (dist < 22) return drive > 0.6 ? "sprint" : drive > 0.35 ? "run" : "jog";
  return drive > 0.65 ? "run" : "jog";
};

/** Recover into shape — defenders stroll, attackers may jog on. */
export const recoverGait = (
  self: Pos2,
  target: Pos2,
  role: Role,
  ownTeamHasBall: boolean,
): Gait => {
  const dist = Math.hypot(target.x - self.x, target.z - self.z);
  const drive = roleDrive(role);
  if (dist < 1.5) return "idle";
  if (dist < 4) return "walk";
  // Holding possession: push forward more eagerly for attackers.
  if (ownTeamHasBall && drive > 0.6 && dist > 8) return "run";
  if (dist < 9) return drive < 0.35 ? "walk" : "jog";
  if (dist < 18) return drive < 0.4 ? "jog" : "run";
  // Deep CB still rarely full-sprints to a shape spot.
  return drive > 0.55 ? "run" : "jog";
};

/** Marking / tracking — mostly jockey & walk, never a blanket sprint. */
export const trackGait = (self: Pos2, mark: Pos2, role: Role): Gait => {
  const dist = Math.hypot(mark.x - self.x, mark.z - self.z);
  const drive = roleDrive(role);
  if (dist < 1.8) return "idle";
  if (dist < 4) return "walk";
  if (dist < 8) return drive > 0.5 ? "jog" : "walk";
  return drive > 0.6 ? "run" : "jog";
};

/** First press / chase vs cover / support. */
export const pressGait = (
  self: Pos2,
  focus: Pos2,
  chaseRank: number,
  role: Role,
): Gait => {
  const dist = Math.hypot(focus.x - self.x, focus.z - self.z);
  const drive = roleDrive(role);
  if (chaseRank >= 1) {
    // Cover: jog / run, rarely max sprint.
    if (dist < 5) return "jog";
    return drive > 0.55 ? "run" : "jog";
  }
  if (dist < 3) return "run";
  if (dist < 12) return drive > 0.4 ? "sprint" : "run";
  return "sprint";
};

export const interceptGait = (): Gait => "sprint";
export const tackleGait = (): Gait => "sprint";
