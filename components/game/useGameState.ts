import { useStore } from "zustand/react";
import { gameStateStore, type GameState } from "../../engine/match/gameState";

// The ONLY bridge between React and the engine's game-state store. The
// engine (gameStateStore) doesn't know this exists — it's plain zustand/
// vanilla underneath. This hook is how UI components read it reactively;
// they should never import gameStateStore directly.
export const useGameStore = <T,>(selector: (state: GameState) => T): T =>
  useStore(gameStateStore, selector);
