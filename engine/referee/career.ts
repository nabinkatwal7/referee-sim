// Step 59 — Career ladder.
// Youth → Regional → National → Champions League → World Cup.

export type CareerTier =
  | "youth"
  | "regional"
  | "national"
  | "championsLeague"
  | "worldCup";

export const CAREER_ORDER: CareerTier[] = [
  "youth",
  "regional",
  "national",
  "championsLeague",
  "worldCup",
];

export const CAREER_LABEL: Record<CareerTier, string> = {
  youth: "Youth League",
  regional: "Regional",
  national: "National",
  championsLeague: "Champions League",
  worldCup: "World Cup",
};

/** Minimum overall rating + matches to unlock the next tier. */
export const CAREER_REQUIREMENTS: Record<
  CareerTier,
  { minRating: number; minMatches: number }
> = {
  youth: { minRating: 0, minMatches: 0 },
  regional: { minRating: 6.5, minMatches: 3 },
  national: { minRating: 7.5, minMatches: 8 },
  championsLeague: { minRating: 8.5, minMatches: 15 },
  worldCup: { minRating: 9.0, minMatches: 25 },
};

export type CareerState = {
  tier: CareerTier;
  matchesCompleted: number;
  unlocked: CareerTier[];
};

export const createCareer = (): CareerState => ({
  tier: "youth",
  matchesCompleted: 0,
  unlocked: ["youth"],
});

export const progressCareer = (
  career: CareerState,
  matchOverallRating: number,
): CareerState => {
  const matchesCompleted = career.matchesCompleted + 1;
  const unlocked = [...career.unlocked];
  let tier = career.tier;

  for (const next of CAREER_ORDER) {
    if (unlocked.includes(next)) continue;
    const req = CAREER_REQUIREMENTS[next];
    if (matchesCompleted >= req.minMatches && matchOverallRating >= req.minRating) {
      unlocked.push(next);
      tier = next;
    }
  }

  // Stay on highest unlocked.
  for (let i = CAREER_ORDER.length - 1; i >= 0; i--) {
    if (unlocked.includes(CAREER_ORDER[i])) {
      tier = CAREER_ORDER[i];
      break;
    }
  }

  return { tier, matchesCompleted, unlocked };
};
