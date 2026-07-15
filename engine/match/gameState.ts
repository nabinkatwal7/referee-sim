import { createStore } from "zustand/vanilla";
import type { PossibleFoulEvent } from "./events";
import {
  createMatchClockSnapshot,
  MatchState,
  type MatchClockSnapshot,
} from "./MatchStateMachine";

export type Score = { home: number; away: number };
export type Card = { playerIndex: number; type: "yellow" | "red" };
export type ReplayState = "live" | "replay";

export type GameState = {
  score: Score;
  time: number; // legacy wall seconds — prefer matchClock.display
  matchClock: MatchClockSnapshot;
  cards: Card[];
  possession: number | null;
  currentEvent: string | null;
  replayState: ReplayState;
  paused: boolean;
  matchPhase: MatchState;

  pendingFoul: PossibleFoulEvent | null;
  decisionWindowOpen: boolean;
  pendingReactionTime: number | null;
  rating: number;

  addGoal: (team: "home" | "away") => void;
  setTime: (time: number) => void;
  setMatchClock: (clock: MatchClockSnapshot) => void;
  addCard: (card: Card) => void;
  setPossession: (playerIndex: number | null) => void;
  setCurrentEvent: (event: string | null) => void;
  setReplayState: (state: ReplayState) => void;
  setPaused: (paused: boolean) => void;
  setMatchPhase: (phase: MatchState) => void;

  setPendingFoul: (event: PossibleFoulEvent | null) => void;
  openDecisionWindow: (reactionTime: number) => void;
  closeDecisionWindow: () => void;
  adjustRating: (delta: number) => void;
};

export const gameStateStore = createStore<GameState>((set) => ({
  score: { home: 0, away: 0 },
  time: 0,
  matchClock: createMatchClockSnapshot(),
  cards: [],
  possession: null,
  currentEvent: null,
  replayState: "live",
  paused: false,
  matchPhase: MatchState.PRE_MATCH,

  pendingFoul: null,
  decisionWindowOpen: false,
  pendingReactionTime: null,
  rating: 10.0,

  addGoal: (team) => set((s) => ({ score: { ...s.score, [team]: s.score[team] + 1 } })),
  setTime: (time) => set({ time }),
  setMatchClock: (matchClock) => set({ matchClock }),
  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),
  setPossession: (playerIndex) => set({ possession: playerIndex }),
  setCurrentEvent: (event) => set({ currentEvent: event }),
  setReplayState: (replayState) => set({ replayState }),
  setPaused: (paused) => set({ paused }),
  setMatchPhase: (matchPhase) => set({ matchPhase }),

  setPendingFoul: (event) => set({ pendingFoul: event }),
  openDecisionWindow: (reactionTime) =>
    set({ decisionWindowOpen: true, paused: true, pendingReactionTime: reactionTime }),
  closeDecisionWindow: () =>
    set({ decisionWindowOpen: false, paused: false, pendingFoul: null, pendingReactionTime: null }),
  adjustRating: (delta) => set((s) => ({ rating: Math.max(0, Math.min(10, s.rating + delta)) })),
}));
