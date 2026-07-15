// Step 57 — Match Rating dimensions.
// Accuracy · Consistency · Control · Positioning · Timing → overall.

export type MatchRating = {
  accuracy: number;
  consistency: number;
  control: number;
  positioning: number;
  timing: number;
  overall: number;
};

export const createMatchRating = (): MatchRating => ({
  accuracy: 10,
  consistency: 10,
  control: 10,
  positioning: 10,
  timing: 10,
  overall: 10,
});

const clampR = (v: number) => Math.max(0, Math.min(10, v));

const reoverall = (r: MatchRating): MatchRating => ({
  ...r,
  overall: clampR(
    (r.accuracy + r.consistency + r.control + r.positioning + r.timing) / 5,
  ),
});

export const applyDecisionToRating = (
  prev: MatchRating,
  opts: {
    correct: boolean;
    late: boolean;
    excellentPositioning: boolean;
    visionQuality: number;
  },
): MatchRating => {
  let { accuracy, consistency, control, positioning, timing } = prev;

  if (opts.correct) {
    accuracy = clampR(accuracy + 0.15);
    control = clampR(control + 0.1);
    consistency = clampR(consistency + 0.05);
  } else {
    accuracy = clampR(accuracy - 0.35);
    consistency = clampR(consistency - 0.2);
    control = clampR(control - 0.15);
  }

  if (opts.late) timing = clampR(timing - 0.25);
  else timing = clampR(timing + 0.08);

  if (opts.excellentPositioning) positioning = clampR(positioning + 0.2);
  else if (opts.visionQuality < 0.35) positioning = clampR(positioning - 0.15);

  return reoverall({ accuracy, consistency, control, positioning, timing, overall: 0 });
};
