import { createStore } from "zustand/vanilla";
import type { PossibleFoulEvent } from "./events";
import {
  createMatchClockSnapshot,
  MatchState,
  type MatchClockSnapshot,
} from "./MatchStateMachine";
import type { MatchRating } from "../referee/rating";
import { createMatchRating } from "../referee/rating";
import type { CareerState } from "../referee/career";
import { createCareer } from "../referee/career";
import type { AssistantState } from "../referee/assistants";
import { createAssistants } from "../referee/assistants";
import type { VarState } from "../referee/var";
import { createVarState } from "../referee/var";

export type Score = { home: number; away: number };
export type Card = { playerIndex: number; type: "yellow" | "red" };
export type ReplayState = "live" | "replay" | "var";

export type AdvantageState = {
  foul: PossibleFoulEvent;
  expiresAt: number;
} | null;

export type GameState = {
  score: Score;
  time: number;
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
  /** Scalar mirror of rating.overall for HUD compatibility. */
  rating: number;
  matchRating: MatchRating;
  advantage: AdvantageState;
  assistants: AssistantState;
  varState: VarState;
  career: CareerState;

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
  setMatchRating: (rating: MatchRating) => void;
  adjustRating: (delta: number) => void;
  setAdvantage: (advantage: AdvantageState) => void;
  setAssistants: (assistants: AssistantState) => void;
  setVarState: (varState: VarState) => void;
  setCareer: (career: CareerState) => void;
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
  matchRating: createMatchRating(),
  advantage: null,
  assistants: createAssistants(),
  varState: createVarState(),
  career: createCareer(),

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
  setMatchRating: (matchRating) => set({ matchRating, rating: matchRating.overall }),
  adjustRating: (delta) =>
    set((s) => {
      const overall = Math.max(0, Math.min(10, s.rating + delta));
      return { rating: overall, matchRating: { ...s.matchRating, overall } };
    }),
  setAdvantage: (advantage) => set({ advantage }),
  setAssistants: (assistants) => set({ assistants }),
  setVarState: (varState) => set({ varState }),
  setCareer: (career) => set({ career }),
}));
