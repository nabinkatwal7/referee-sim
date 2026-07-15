import { PITCH_LENGTH } from "../components/game/pitchDimensions";

export type Role = "GK" | "LB" | "CB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "RW" | "ST";

export type FormationSlot = {
  role: Role;
  x: number; // lateral offset from the center line, meters (negative = left)
  forward: number; // distance from own goal line toward the halfway line, meters
};

// 4-3-3: GK, back four, midfield three, front three.
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

const OWN_GOAL_LINE = PITCH_LENGTH / 2;

export type Side = "A" | "B";

// Every player owns a home position, derived from its formation slot and
// which goal its team defends (team B's shape mirrors team A's across the
// halfway line).
export const homePositionForSlot = (slot: FormationSlot, side: Side): [number, number, number] => {
  const z = side === "A" ? -OWN_GOAL_LINE + slot.forward : OWN_GOAL_LINE - slot.forward;
  return [slot.x, 1, z];
};
