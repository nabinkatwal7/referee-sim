import type { TeamId } from "../team/Team";
import type { Vec2 } from "../match/events";

// Step 56 — Assistant Referees.
// Each AR tracks offside / throw-ins / corners / goal kicks and recommends.

export type AssistantSide = "left" | "right";

export type AssistantSignalKind =
  | "offside"
  | "throwIn"
  | "corner"
  | "goalKick"
  | "clear";

export type AssistantSignal = {
  side: AssistantSide;
  kind: AssistantSignalKind;
  team?: TeamId;
  confidence: number; // 0..1
  position?: Vec2;
  at: number;
};

export type AssistantState = {
  left: AssistantSignal | null;
  right: AssistantSignal | null;
};

export const createAssistants = (): AssistantState => ({
  left: null,
  right: null,
});

/** Left AR covers -x touchline / that half of attack; right covers +x. */
export const sideForPosition = (x: number): AssistantSide => (x < 0 ? "left" : "right");

export const recommendRestart = (
  kind: "throwIn" | "corner" | "goalKick",
  team: TeamId,
  position: Vec2,
  at: number,
): AssistantSignal => ({
  side: sideForPosition(position.x),
  kind,
  team,
  confidence: 0.85 + Math.random() * 0.1,
  position,
  at,
});

export const recommendOffside = (
  team: TeamId,
  position: Vec2,
  at: number,
  visionQuality: number,
): AssistantSignal => ({
  side: sideForPosition(position.x),
  kind: "offside",
  team,
  confidence: Math.max(0.4, visionQuality),
  position,
  at,
});

export const applyAssistantSignal = (
  state: AssistantState,
  signal: AssistantSignal,
) => {
  if (signal.side === "left") state.left = signal;
  else state.right = signal;
};
