import type { TeamId } from "../../engine/team/Team";

// Step 41 — Touch Detection.
// Every touch stores player, team, position, time — feeds offside / restarts.

export type TouchRecord = {
  playerIndex: number;
  team: TeamId;
  role: string;
  position: { x: number; z: number };
  at: number; // match clock, seconds
};

const MAX_TOUCHES = 64;

export type TouchLog = {
  touches: TouchRecord[];
  last: TouchRecord | null;
  previous: TouchRecord | null;
};

export const createTouchLog = (): TouchLog => ({
  touches: [],
  last: null,
  previous: null,
});

export const recordBallTouch = (
  log: TouchLog,
  touch: TouchRecord,
) => {
  log.previous = log.last;
  log.last = touch;
  log.touches.push(touch);
  if (log.touches.length > MAX_TOUCHES) log.touches.shift();
};

export const lastTouchTeam = (log: TouchLog): TeamId | null => log.last?.team ?? null;
