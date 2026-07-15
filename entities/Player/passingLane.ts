import type { Pos2 } from "../Ball/nearestPlayer";

// Step 35 — Passing Lanes.
// Raycast Player A → Player B: is an opponent blocking? → risk score.

export type LaneResult = {
  blocked: boolean;
  /** 0 = clear, higher = more bodies in the lane. */
  risk: number;
  blockers: number;
};

const LANE_HALF_WIDTH = 2.8;

/**
 * 2D "ray" from A to B: count opponents whose projection lies on the segment
 * and within LANE_HALF_WIDTH of the line.
 */
export const raycastPassLane = (
  from: Pos2,
  to: Pos2,
  opponents: Pos2[],
): LaneResult => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;

  let risk = 0;
  let blockers = 0;

  for (const o of opponents) {
    const ox = o.x - from.x;
    const oz = o.z - from.z;
    const along = ox * ux + oz * uz;
    if (along <= 0.5 || along >= len - 0.5) continue;
    const perp = Math.abs(ox * uz - oz * ux);
    if (perp >= LANE_HALF_WIDTH) continue;
    blockers += 1;
    // Closer to the center of the lane + closer to receiver → worse.
    const centrality = 1 - perp / LANE_HALF_WIDTH;
    const proximity = 1 - Math.abs(along / len - 0.5);
    risk += centrality * (0.6 + proximity * 0.4);
  }

  return { blocked: blockers > 0, risk, blockers };
};
