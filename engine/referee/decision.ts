import type { FoulSeverity } from "../../entities/Player/collisionDetector";

export type DecisionAction = "playOn" | "advantage" | "foul" | "yellow" | "red";

export const LATE_THRESHOLD = 4; // seconds between the incident and the whistle
export const PENDING_TIMEOUT = 10; // seconds before an unacted-on incident auto-resolves
export const POSITIONING_QUALITY_THRESHOLD = 0.8;

export const CORRECT_BONUS = 0.2;
export const WRONG_PENALTY = -0.3;
export const LATE_PENALTY = -0.1;
export const POSITIONING_BONUS = 0.1;

const CORRECT_ACTIONS: Record<FoulSeverity, DecisionAction[]> = {
  clean: ["playOn", "advantage"],
  foul: ["foul", "advantage"],
  reckless: ["yellow", "red"],
};

export type DecisionOutcome = {
  correct: boolean;
  late: boolean;
  excellentPositioning: boolean;
  ratingDelta: number;
};

// Start at 10.0. Every decision: correct +, wrong -, late -, excellent
// positioning +. Positioning is judged by the same vision-quality score used
// to decide whether the referee sees fouls/offside at all (engine/referee/
// vision.ts) — good camera work before the incident pays off here.
export const scoreDecision = (
  severity: FoulSeverity,
  action: DecisionAction,
  reactionTime: number,
  visionQuality: number,
): DecisionOutcome => {
  const correct = CORRECT_ACTIONS[severity].includes(action);
  const late = reactionTime > LATE_THRESHOLD;
  const excellentPositioning = visionQuality >= POSITIONING_QUALITY_THRESHOLD;

  let ratingDelta = correct ? CORRECT_BONUS : WRONG_PENALTY;
  if (late) ratingDelta += LATE_PENALTY;
  if (excellentPositioning) ratingDelta += POSITIONING_BONUS;

  return { correct, late, excellentPositioning, ratingDelta };
};
