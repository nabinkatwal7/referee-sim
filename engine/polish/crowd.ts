// Step 60 — Crowd AI + crowd pressure.

export type CrowdMood = "bored" | "neutral" | "excited" | "hostile" | "celebrating";

export type CrowdState = {
  /** Ambient noise 0..1. */
  volume: number;
  mood: CrowdMood;
  /** Pressure on the referee (feeds rating distraction). */
  pressure: number;
  homeBias: number;
};

export const createCrowd = (): CrowdState => ({
  volume: 0.35,
  mood: "neutral",
  pressure: 0.2,
  homeBias: 0.55,
});

export type CrowdCue =
  | { kind: "goal"; home: boolean }
  | { kind: "foul"; controversial: boolean }
  | { kind: "card"; red: boolean }
  | { kind: "nearMiss" }
  | { kind: "tick"; scoreDiff: number };

export const reactCrowd = (crowd: CrowdState, cue: CrowdCue): CrowdState => {
  let { volume, mood, pressure, homeBias } = crowd;

  switch (cue.kind) {
    case "goal":
      volume = Math.min(1, volume + (cue.home ? 0.35 : 0.15));
      mood = cue.home ? "celebrating" : "hostile";
      pressure = Math.min(1, pressure + (cue.home ? 0.05 : 0.2));
      break;
    case "foul":
      volume = Math.min(1, volume + 0.12);
      mood = cue.controversial ? "hostile" : "excited";
      pressure = Math.min(1, pressure + (cue.controversial ? 0.18 : 0.06));
      break;
    case "card":
      volume = Math.min(1, volume + (cue.red ? 0.25 : 0.1));
      mood = cue.red ? "hostile" : "excited";
      pressure = Math.min(1, pressure + (cue.red ? 0.15 : 0.05));
      break;
    case "nearMiss":
      volume = Math.min(1, volume + 0.08);
      mood = "excited";
      break;
    case "tick": {
      // Ambient decay toward calm; home lead → happier crowd.
      volume = Math.max(0.2, volume * 0.992);
      pressure = Math.max(0.1, pressure * 0.997);
      if (Math.abs(cue.scoreDiff) < 2 && mood === "celebrating") mood = "excited";
      if (volume < 0.3) mood = "bored";
      else if (mood === "bored") mood = "neutral";
      break;
    }
  }

  return { volume, mood, pressure, homeBias };
};

/** Soft rating penalty from crowd when pressure is high. */
export const crowdPressureDelta = (
  pressure: number,
  weight: number,
  delta: number,
): number => -(pressure * weight * 0.015 * delta);
