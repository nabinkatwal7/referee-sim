// Step 60 — Player protests after cards / contentious calls.

export type ProtestState = {
  active: boolean;
  playerIndex: number | null;
  intensity: number;
  expiresAt: number;
};

export const createProtest = (): ProtestState => ({
  active: false,
  playerIndex: null,
  intensity: 0,
  expiresAt: 0,
});

export const beginProtest = (
  at: number,
  playerIndex: number,
  intensity = 0.6,
): ProtestState => ({
  active: true,
  playerIndex,
  intensity: Math.min(1, intensity),
  expiresAt: at + 2.5 + intensity * 2,
});

export const stepProtest = (p: ProtestState, at: number): ProtestState => {
  if (!p.active) return p;
  if (at >= p.expiresAt) return createProtest();
  return p;
};
