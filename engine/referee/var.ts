import type { TeamId } from "../team/Team";
import type { Vec2 } from "../match/events";

// Step 58 — VAR.
// Review goals, penalties, red cards, mistaken identity — via replay buffer.

export type VarReviewKind = "goal" | "penalty" | "red" | "mistakenIdentity";

export type VarIncident = {
  kind: VarReviewKind;
  team?: TeamId;
  playerA?: number;
  playerB?: number;
  position?: Vec2;
  at: number;
  cameras: ("main" | "sideline" | "goalLine" | "tactical")[];
};

export type VarState = {
  queue: VarIncident[];
  active: VarIncident | null;
  outcome: "pending" | "confirmed" | "overturned" | null;
};

export const createVarState = (): VarState => ({
  queue: [],
  active: null,
  outcome: null,
});

export const enqueueVar = (state: VarState, incident: VarIncident) => {
  state.queue.push(incident);
};

export const beginVarReview = (state: VarState): VarIncident | null => {
  if (state.active || state.queue.length === 0) return null;
  state.active = state.queue.shift()!;
  state.outcome = "pending";
  return state.active;
};

export const resolveVar = (
  state: VarState,
  outcome: "confirmed" | "overturned",
) => {
  state.outcome = outcome;
  state.active = null;
};
