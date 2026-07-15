import { createStore } from "zustand/vanilla";
import type { PossibleFoulEvent } from "./events";

export type Score = { home: number; away: number };
export type Card = { playerIndex: number; type: "yellow" | "red" };
export type ReplayState = "live" | "replay";

export type GameState = {
  score: Score;
  time: number; // seconds elapsed in the match
  cards: Card[];
  possession: number | null; // player index currently holding the ball
  currentEvent: string | null;
  replayState: ReplayState;
  paused: boolean;

  // Whistle System (Phase 18) + Match Rating (Phase 19)
  pendingFoul: PossibleFoulEvent | null; // an incident awaiting the player's whistle
  decisionWindowOpen: boolean;
  pendingReactionTime: number | null; // seconds between the incident and the whistle being blown
  rating: number; // starts at 10.0

  addGoal: (team: "home" | "away") => void;
  setTime: (time: number) => void;
  addCard: (card: Card) => void;
  setPossession: (playerIndex: number | null) => void;
  setCurrentEvent: (event: string | null) => void;
  setReplayState: (state: ReplayState) => void;
  setPaused: (paused: boolean) => void;

  setPendingFoul: (event: PossibleFoulEvent | null) => void;
  openDecisionWindow: (reactionTime: number) => void;
  closeDecisionWindow: () => void;
  adjustRating: (delta: number) => void;
};

// Game state only — score, clock, cards, possession, the current event,
// replay state, pause (plus the whistle/rating fields this feature needs).
// Positions/physics belong to the engine (GameLoop), not here.
//
// Architecture rule: the engine must not know React exists. This is built
// with zustand/vanilla's createStore, which is a plain object with
// getState/setState/subscribe — no React import anywhere in this file, and
// none needed by GameLoop/storeSync/whistle either. A separate React hook
// (components/game/useGameState.ts) wraps THIS store with zustand/react's
// useStore for the UI layer to consume reactively; the engine never touches
// that hook.
export const gameStateStore = createStore<GameState>((set) => ({
  score: { home: 0, away: 0 },
  time: 0,
  cards: [],
  possession: null,
  currentEvent: null,
  replayState: "live",
  paused: false,

  pendingFoul: null,
  decisionWindowOpen: false,
  pendingReactionTime: null,
  rating: 10.0,

  addGoal: (team) => set((s) => ({ score: { ...s.score, [team]: s.score[team] + 1 } })),
  setTime: (time) => set({ time }),
  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),
  setPossession: (playerIndex) => set({ possession: playerIndex }),
  setCurrentEvent: (event) => set({ currentEvent: event }),
  setReplayState: (replayState) => set({ replayState }),
  setPaused: (paused) => set({ paused }),

  setPendingFoul: (event) => set({ pendingFoul: event }),
  openDecisionWindow: (reactionTime) =>
    set({ decisionWindowOpen: true, paused: true, pendingReactionTime: reactionTime }),
  closeDecisionWindow: () =>
    set({ decisionWindowOpen: false, paused: false, pendingFoul: null, pendingReactionTime: null }),
  adjustRating: (delta) => set((s) => ({ rating: Math.max(0, Math.min(10, s.rating + delta)) })),
}));
