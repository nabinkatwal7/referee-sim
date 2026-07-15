import { create } from "zustand";

export type Score = { home: number; away: number };
export type Card = { playerIndex: number; type: "yellow" | "red" };
export type ReplayState = "live" | "replay";

type GameState = {
  score: Score;
  time: number; // seconds elapsed in the match
  cards: Card[];
  possession: number | null; // player index currently holding the ball
  currentEvent: string | null;
  replayState: ReplayState;
  paused: boolean;

  addGoal: (team: "home" | "away") => void;
  setTime: (time: number) => void;
  addCard: (card: Card) => void;
  setPossession: (playerIndex: number | null) => void;
  setCurrentEvent: (event: string | null) => void;
  setReplayState: (state: ReplayState) => void;
  setPaused: (paused: boolean) => void;
};

// Game state only — score, clock, cards, possession, the current event,
// replay state, pause. Positions/physics belong to the engine (GameLoop),
// not here; the engine writes into this store via its vanilla API
// (getState/setState), which is why this stays usable from a plain class
// with no React import.
export const useGameStore = create<GameState>((set) => ({
  score: { home: 0, away: 0 },
  time: 0,
  cards: [],
  possession: null,
  currentEvent: null,
  replayState: "live",
  paused: false,

  addGoal: (team) => set((s) => ({ score: { ...s.score, [team]: s.score[team] + 1 } })),
  setTime: (time) => set({ time }),
  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),
  setPossession: (playerIndex) => set({ possession: playerIndex }),
  setCurrentEvent: (event) => set({ currentEvent: event }),
  setReplayState: (replayState) => set({ replayState }),
  setPaused: (paused) => set({ paused }),
}));
