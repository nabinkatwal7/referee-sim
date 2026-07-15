// Step 60 — Injuries from heavy contact.

export type InjurySeverity = "knock" | "limping" | "stretcher";

export type InjuryRecord = {
  playerIndex: number;
  severity: InjurySeverity;
  at: number;
};

export type InjuryState = {
  list: InjuryRecord[];
  /** Players currently slowed / out. */
  limping: number[];
};

export const createInjuries = (): InjuryState => ({ list: [], limping: [] });

/** Hard foulScore contact may injure. */
export const rollInjury = (
  state: InjuryState,
  playerIndex: number,
  foulScore: number,
  at: number,
): InjuryState => {
  if (foulScore < 0.55) return state;
  const chance = (foulScore - 0.5) * 0.4;
  if (Math.random() > chance) return state;

  const severity: InjurySeverity =
    foulScore > 0.85 ? "stretcher" : foulScore > 0.7 ? "limping" : "knock";
  const list = [...state.list, { playerIndex, severity, at }];
  const limping =
    severity === "knock"
      ? state.limping
      : state.limping.includes(playerIndex)
        ? state.limping
        : [...state.limping, playerIndex];
  return { list, limping };
};
