// Step 60 — Match statistics.

export type MatchStatistics = {
  passes: number;
  shots: number;
  tackles: number;
  fouls: number;
  cards: number;
  corners: number;
  throwIns: number;
  goalKicks: number;
  injuries: number;
  protests: number;
};

export const createStatistics = (): MatchStatistics => ({
  passes: 0,
  shots: 0,
  tackles: 0,
  fouls: 0,
  cards: 0,
  corners: 0,
  throwIns: 0,
  goalKicks: 0,
  injuries: 0,
  protests: 0,
});

export const bumpStat = <K extends keyof MatchStatistics>(
  stats: MatchStatistics,
  key: K,
  by = 1,
): MatchStatistics => ({ ...stats, [key]: stats[key] + by });
