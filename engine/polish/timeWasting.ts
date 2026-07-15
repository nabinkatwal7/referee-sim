// Step 60 — Time wasting at restarts.

export type TimeWasteState = {
  stallSeconds: number;
  flagged: boolean;
  /** Soft warn for HUD / fourth official. */
  warning: string | null;
};

export const createTimeWaste = (): TimeWasteState => ({
  stallSeconds: 0,
  flagged: false,
  warning: null,
});

/** Call each frame while a restart is active and the ball hasn't been taken. */
export const stepTimeWaste = (
  state: TimeWasteState,
  delta: number,
  restartActive: boolean,
): TimeWasteState => {
  if (!restartActive) {
    return state.stallSeconds === 0 && !state.flagged
      ? state
      : createTimeWaste();
  }

  const stallSeconds = state.stallSeconds + delta;
  let flagged = state.flagged;
  let warning = state.warning;

  if (stallSeconds > 8 && !flagged) {
    flagged = true;
    warning = "Time wasting — hurry the restart";
  } else if (stallSeconds > 5 && !warning) {
    warning = "Slow restart…";
  }

  return { stallSeconds, flagged, warning };
};
