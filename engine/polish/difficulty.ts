// Step 60 — Difficulty levels. Scales AI aggression & foul leniency.

export type Difficulty = "easy" | "normal" | "hard";

export type DifficultyParams = {
  /** Multiplier on team pressing tactics (0.7–1.25). */
  pressingMul: number;
  /** Multiplier on foulScore before whistle threshold. */
  foulSensitivity: number;
  /** Crowd noise → rating distraction. */
  pressureWeight: number;
};

export const DIFFICULTY_PARAMS: Record<Difficulty, DifficultyParams> = {
  easy: { pressingMul: 0.75, foulSensitivity: 0.85, pressureWeight: 0.4 },
  normal: { pressingMul: 1, foulSensitivity: 1, pressureWeight: 0.7 },
  hard: { pressingMul: 1.25, foulSensitivity: 1.15, pressureWeight: 1 },
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};
