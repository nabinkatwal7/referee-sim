import type { TackleMetrics } from "./tackle";

// Step 50 — Foul Scoring.
// Every collision → 0.00..1.00 from speed, direction, intent, ball, studs, behind, late.

export type FoulSeverity = "clean" | "foul" | "reckless";

export type FoulScoreInput = {
  tackle: TackleMetrics;
  /** 1 if challenger comes from behind the victim's facing (attack dir). */
  fromBehind: boolean;
  /** Challenge after ball already left / late. */
  late: boolean;
  /** Studs-up stand-in: foot on leg/body contact at high speed. */
  studs: boolean;
};

export type FoulScoreResult = {
  score: number; // 0..1
  severity: FoulSeverity;
  intent: number;
  factors: {
    speed: number;
    direction: number;
    intent: number;
    ballContact: number;
    studs: number;
    behind: number;
    late: number;
  };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const scoreFoul = (input: FoulScoreInput): FoulScoreResult => {
  const { tackle, fromBehind, late, studs } = input;

  const speed = clamp01(tackle.speed / 8);
  // Angle: attacking through ball is cleaner; sideways/off-ball is dirtier.
  const direction = clamp01(tackle.angle / Math.PI); // 0 = toward ball, 1 = opposite
  const ballContact = tackle.ballTouched ? 0 : 0.35;
  const studsF = studs ? 0.4 : 0;
  const behind = fromBehind ? 0.25 : 0;
  const lateF = late ? 0.3 : 0;
  // Intent proxy: high force + no ball + (behind|late|studs)
  const intent = clamp01(
    tackle.force / 12 + (tackle.ballTouched ? -0.2 : 0.25) + (fromBehind || late ? 0.2 : 0),
  );

  const score = clamp01(
    speed * 0.2 +
      direction * 0.15 +
      intent * 0.25 +
      ballContact * 0.15 +
      studsF * 0.1 +
      behind * 0.08 +
      lateF * 0.07,
  );

  const severity: FoulSeverity =
    score >= 0.72 ? "reckless" : score >= 0.38 ? "foul" : "clean";

  return {
    score,
    severity,
    intent,
    factors: {
      speed,
      direction,
      intent,
      ballContact,
      studs: studsF,
      behind,
      late: lateF,
    },
  };
};

export const severityFromScore = (score: number): FoulSeverity =>
  score >= 0.72 ? "reckless" : score >= 0.38 ? "foul" : "clean";
