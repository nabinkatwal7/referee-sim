// Formation shapes — pitch is 105 long × 68 wide; goal lines at z = ±52.5.
// `forward` is meters FROM OWN GOAL LINE toward the opponent.

import type { Role } from "./Player/stats";

export type { Role };

export type Side = "A" | "B";

export type FormationName = "4-4-2" | "4-3-3" | "3-5-2" | "5-3-2";
/** @deprecated alias — prefer FormationName */
export type FormationId = FormationName;

export type FormationSlot = {
  role: Role;
  /** Lateral offset from pitch center (meters). Neg = left. */
  x: number;
  /** Distance from own goal line toward opponent. */
  forward: number;
};

export type Formation = {
  name: FormationName;
  slots: FormationSlot[];
};

const HALF_LEN = 52.5;
const OWN_GOAL_LINE = HALF_LEN;

/** Kickoff / base shape — depth into OWN half so attackers aren't glued to center circle. */
export const FORMATION_4_4_2: Formation = {
  name: "4-4-2",
  slots: [
    { role: "GK", x: 0, forward: 1 },
    { role: "LB", x: -22, forward: 18 },
    { role: "CB", x: -7, forward: 14 },
    { role: "CB", x: 7, forward: 14 },
    { role: "RB", x: 22, forward: 18 },
    { role: "LM", x: -24, forward: 32 },
    { role: "CM", x: -8, forward: 30 },
    { role: "CM", x: 8, forward: 30 },
    { role: "RM", x: 24, forward: 32 },
    { role: "ST", x: -6, forward: 42 },
    { role: "ST", x: 6, forward: 42 },
  ],
};

export const FORMATION_4_3_3: Formation = {
  name: "4-3-3",
  slots: [
    { role: "GK", x: 0, forward: 1 },
    { role: "LB", x: -22, forward: 18 },
    { role: "CB", x: -7, forward: 14 },
    { role: "CB", x: 7, forward: 14 },
    { role: "RB", x: 22, forward: 18 },
    { role: "CDM", x: 0, forward: 28 },
    { role: "CM", x: -10, forward: 34 },
    { role: "CM", x: 10, forward: 34 },
    { role: "LW", x: -22, forward: 44 },
    { role: "ST", x: 0, forward: 46 },
    { role: "RW", x: 22, forward: 44 },
  ],
};

export const FORMATION_3_5_2: Formation = {
  name: "3-5-2",
  slots: [
    { role: "GK", x: 0, forward: 1 },
    { role: "CB", x: -10, forward: 14 },
    { role: "CB", x: 0, forward: 12 },
    { role: "CB", x: 10, forward: 14 },
    { role: "LWB", x: -26, forward: 30 },
    { role: "CDM", x: 0, forward: 26 },
    { role: "CM", x: -9, forward: 34 },
    { role: "CM", x: 9, forward: 34 },
    { role: "RWB", x: 26, forward: 30 },
    { role: "ST", x: -6, forward: 44 },
    { role: "ST", x: 6, forward: 44 },
  ],
};

export const FORMATION_5_3_2: Formation = {
  name: "5-3-2",
  slots: [
    { role: "GK", x: 0, forward: 1 },
    { role: "LWB", x: -26, forward: 22 },
    { role: "CB", x: -12, forward: 12 },
    { role: "CB", x: 0, forward: 11 },
    { role: "CB", x: 12, forward: 12 },
    { role: "RWB", x: 26, forward: 22 },
    { role: "CM", x: -10, forward: 30 },
    { role: "CDM", x: 0, forward: 28 },
    { role: "CM", x: 10, forward: 30 },
    { role: "ST", x: -6, forward: 42 },
    { role: "ST", x: 6, forward: 42 },
  ],
};

export const FORMATIONS: Record<FormationName, Formation> = {
  "4-4-2": FORMATION_4_4_2,
  "4-3-3": FORMATION_4_3_3,
  "3-5-2": FORMATION_3_5_2,
  "5-3-2": FORMATION_5_3_2,
};

/** Extra meters toward the opponent goal when the team is attacking. */
const ATTACK_PUSH: Partial<Record<Role, number>> = {
  GK: 0,
  CB: 6,
  LB: 12,
  RB: 12,
  LWB: 16,
  RWB: 16,
  CDM: 10,
  CM: 14,
  CAM: 20,
  LM: 14,
  RM: 14,
  LW: 22,
  RW: 22,
  ST: 26,
};

/** Extra meters toward own goal when defending. */
const DEFEND_DROP: Partial<Record<Role, number>> = {
  GK: 0,
  CB: 4,
  LB: 6,
  RB: 6,
  LWB: 8,
  RWB: 8,
  CDM: 8,
  CM: 10,
  CAM: 12,
  LM: 10,
  RM: 10,
  LW: 14,
  RW: 14,
  ST: 16,
};

export const homePositionForSlot = (
  slot: FormationSlot,
  side: Side,
): [number, number, number] => {
  const z =
    side === "A" ? -OWN_GOAL_LINE + slot.forward : OWN_GOAL_LINE - slot.forward;
  return [slot.x, 1, z];
};

/** Attack / defend anchors relative to home along the team's attacking axis. */
export const phasePositionsForHome = (
  home: [number, number, number],
  role: Role,
  attackDir: 1 | -1,
): {
  home: [number, number, number];
  attack: [number, number, number];
  defend: [number, number, number];
} => {
  const push = ATTACK_PUSH[role] ?? 12;
  const drop = DEFEND_DROP[role] ?? 8;
  return {
    home,
    attack: [home[0], home[1], home[2] + attackDir * push],
    defend: [home[0], home[1], home[2] - attackDir * drop],
  };
};
