// Step 60 — Substitutions.

import type { TeamId } from "../team/Team";

export type SubEntry = {
  team: TeamId;
  off: number;
  on: number;
  at: number;
  reason: "tactical" | "injury";
};

export type SubstitutionState = {
  used: { home: number; away: number };
  max: number;
  pending: SubEntry | null;
  history: SubEntry[];
};

export const createSubstitutions = (max = 5): SubstitutionState => ({
  used: { home: 0, away: 0 },
  max,
  pending: null,
  history: [],
});

export const queueSubstitution = (
  state: SubstitutionState,
  entry: Omit<SubEntry, "at"> & { at: number },
): SubstitutionState | null => {
  if (state.used[entry.team] >= state.max) return null;
  return { ...state, pending: entry as SubEntry };
};

export const completeSubstitution = (state: SubstitutionState): SubstitutionState => {
  if (!state.pending) return state;
  const sub = state.pending;
  return {
    ...state,
    pending: null,
    used: { ...state.used, [sub.team]: state.used[sub.team] + 1 },
    history: [...state.history, sub],
  };
};
