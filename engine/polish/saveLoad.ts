// Step 60 — Save / load match meta (localStorage).

import type { Difficulty } from "./difficulty";
import type { MatchStatistics } from "./statistics";
import type { WeatherKind } from "./weather";

const KEY = "referee-sim:save";

export type SaveBlob = {
  version: 1;
  savedAt: number;
  score: { home: number; away: number };
  time: number;
  difficulty: Difficulty;
  weather: WeatherKind;
  statistics: MatchStatistics;
  careerTier: string;
  matchesCompleted: number;
};

export const saveMatch = (blob: SaveBlob): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(blob));
    return true;
  } catch {
    return false;
  }
};

export const loadMatch = (): SaveBlob | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveBlob;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearSave = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
