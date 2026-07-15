// Step 60 — Broadcast replay (angles on top of ReplayBuffer).

export type BroadcastAngle = "main" | "sideline" | "goalLine" | "tactical" | "high";

export type BroadcastState = {
  angle: BroadcastAngle;
  label: string | null;
  lastTriggerAt: number;
};

export const createBroadcast = (): BroadcastState => ({
  angle: "main",
  label: null,
  lastTriggerAt: 0,
});

export const beginBroadcastReplay = (
  state: BroadcastState,
  at: number,
  prefer: BroadcastAngle = "main",
): BroadcastState => ({
  angle: prefer,
  label: `Broadcast replay · ${prefer}`,
  lastTriggerAt: at,
});

export const endBroadcastReplay = (state: BroadcastState): BroadcastState => ({
  ...state,
  label: null,
  angle: "main",
});
