// Step 34 — Tactical Width / shape knobs. 0..1 unless noted.

export type TacticalParams = {
  /** Lateral stretch of the block (0 = narrow, 1 = touchline-wide). */
  width: number;
  /** Vertical stretch between lines. */
  depth: number;
  /** How high the defensive line sits (0 = deep, 1 = high). */
  lineHeight: number;
  /** How aggressively we close down (feeds defend press). */
  pressing: number;
  /** How tightly lines stay together (1 = very compact). */
  compactness: number;
};

export const DEFAULT_TACTICS: TacticalParams = {
  width: 0.65,
  depth: 0.55,
  lineHeight: 0.5,
  pressing: 0.55,
  compactness: 0.6,
};

export const clampTactics = (t: Partial<TacticalParams>): TacticalParams => ({
  width: clamp01(t.width ?? DEFAULT_TACTICS.width),
  depth: clamp01(t.depth ?? DEFAULT_TACTICS.depth),
  lineHeight: clamp01(t.lineHeight ?? DEFAULT_TACTICS.lineHeight),
  pressing: clamp01(t.pressing ?? DEFAULT_TACTICS.pressing),
  compactness: clamp01(t.compactness ?? DEFAULT_TACTICS.compactness),
});

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
