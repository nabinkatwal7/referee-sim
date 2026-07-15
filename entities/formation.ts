import { PITCH_LENGTH } from "../components/game/pitchDimensions";

export type Role =
  | "GK"
  | "LB"
  | "CB"
  | "RB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LW"
  | "RW"
  | "ST"
  | "LM"
  | "RM"
  | "LWB"
  | "RWB";

export type FormationId = "4-4-2" | "4-3-3" | "3-5-2" | "5-3-2";

export type FormationSlot = {
  role: Role;
  x: number; // lateral offset from center, meters
  forward: number; // meters from own goal line toward halfway
};

export type Side = "A" | "B";

const OWN_GOAL_LINE = PITCH_LENGTH / 2;

export const FORMATION_4_3_3: FormationSlot[] = [
  { role: "GK", x: 0, forward: 5 },
  { role: "LB", x: -22, forward: 19 },
  { role: "CB", x: -7, forward: 17 },
  { role: "CB", x: 7, forward: 17 },
  { role: "RB", x: 22, forward: 19 },
  { role: "CDM", x: 0, forward: 30 },
  { role: "CM", x: -13, forward: 40 },
  { role: "CM", x: 13, forward: 40 },
  { role: "LW", x: -20, forward: 49 },
  { role: "ST", x: 0, forward: 51 },
  { role: "RW", x: 20, forward: 49 },
];

export const FORMATION_4_4_2: FormationSlot[] = [
  { role: "GK", x: 0, forward: 5 },
  { role: "LB", x: -22, forward: 19 },
  { role: "CB", x: -7, forward: 17 },
  { role: "CB", x: 7, forward: 17 },
  { role: "RB", x: 22, forward: 19 },
  { role: "LM", x: -20, forward: 36 },
  { role: "CM", x: -8, forward: 34 },
  { role: "CM", x: 8, forward: 34 },
  { role: "RM", x: 20, forward: 36 },
  { role: "ST", x: -6, forward: 50 },
  { role: "ST", x: 6, forward: 50 },
];

export const FORMATION_3_5_2: FormationSlot[] = [
  { role: "GK", x: 0, forward: 5 },
  { role: "CB", x: -10, forward: 17 },
  { role: "CB", x: 0, forward: 16 },
  { role: "CB", x: 10, forward: 17 },
  { role: "LWB", x: -24, forward: 32 },
  { role: "CDM", x: 0, forward: 30 },
  { role: "CM", x: -10, forward: 38 },
  { role: "CM", x: 10, forward: 38 },
  { role: "RWB", x: 24, forward: 32 },
  { role: "ST", x: -6, forward: 50 },
  { role: "ST", x: 6, forward: 50 },
];

export const FORMATION_5_3_2: FormationSlot[] = [
  { role: "GK", x: 0, forward: 5 },
  { role: "LWB", x: -24, forward: 22 },
  { role: "CB", x: -12, forward: 16 },
  { role: "CB", x: 0, forward: 15 },
  { role: "CB", x: 12, forward: 16 },
  { role: "RWB", x: 24, forward: 22 },
  { role: "CM", x: -10, forward: 34 },
  { role: "CDM", x: 0, forward: 32 },
  { role: "CM", x: 10, forward: 34 },
  { role: "ST", x: -6, forward: 50 },
  { role: "ST", x: 6, forward: 50 },
];

export const FORMATIONS: Record<FormationId, FormationSlot[]> = {
  "4-4-2": FORMATION_4_4_2,
  "4-3-3": FORMATION_4_3_3,
  "3-5-2": FORMATION_3_5_2,
  "5-3-2": FORMATION_5_3_2,
};

/** Extra meters toward the opponent goal when the team is attacking. */
const ATTACK_PUSH: Partial<Record<Role, number>> = {
  GK: 0,
  CB: 2,
  LB: 4,
  RB: 4,
  LWB: 6,
  RWB: 6,
  CDM: 5,
  CM: 7,
  CAM: 9,
  LM: 6,
  RM: 6,
  LW: 7,
  RW: 7,
  ST: 5,
};

/** Extra meters toward own goal when defending. */
const DEFEND_DROP: Partial<Record<Role, number>> = {
  GK: 0,
  CB: 1,
  LB: 2,
  RB: 2,
  LWB: 3,
  RWB: 3,
  CDM: 4,
  CM: 6,
  CAM: 8,
  LM: 5,
  RM: 5,
  LW: 8,
  RW: 8,
  ST: 10,
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
  const push = ATTACK_PUSH[role] ?? 5;
  const drop = DEFEND_DROP[role] ?? 5;
  return {
    home,
    attack: [home[0], home[1], home[2] + attackDir * push],
    defend: [home[0], home[1], home[2] - attackDir * drop],
  };
};
