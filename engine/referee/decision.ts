import type { FoulSeverity } from "../../entities/Player/foulScore";
import type { MatchRating } from "./rating";
import { applyDecisionToRating, createMatchRating } from "./rating";

export type DecisionAction = "playOn" | "advantage" | "foul" | "yellow" | "red";

export const LATE_THRESHOLD = 4;
export const PENDING_TIMEOUT = 10;
export const POSITIONING_QUALITY_THRESHOLD = 0.8;
export const ADVANTAGE_WINDOW = 6; // seconds to return to foul if needed

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
  dimensions: MatchRating;
};

export const scoreDecision = (
  severity: FoulSeverity,
  action: DecisionAction,
  reactionTime: number,
  visionQuality: number,
  previous: MatchRating = createMatchRating(),
): DecisionOutcome => {
  const correct = CORRECT_ACTIONS[severity].includes(action);
  const late = reactionTime > LATE_THRESHOLD;
  const excellentPositioning = visionQuality >= POSITIONING_QUALITY_THRESHOLD;

  const dimensions = applyDecisionToRating(previous, {
    correct,
    late,
    excellentPositioning,
    visionQuality,
  });

  return {
    correct,
    late,
    excellentPositioning,
    ratingDelta: dimensions.overall - previous.overall,
    dimensions,
  };
};
