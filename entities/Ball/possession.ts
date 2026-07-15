import type { TeamId } from "../../engine/team/Team";
import type { TouchRecord } from "./touch";

// Who owns the ball, categorically: nobody (Loose), one team's outfield
// players (Blue = home, Red = away — matches our team colors), or
// specifically a goalkeeper (regardless of which team, since a keeper
// holding it is its own distinct situation — usually a save or back-pass).
export type PossessionState = "loose" | "blue" | "red" | "goalkeeper";

export type Touch = TouchRecord;

export type BallPossession = {
  owner: { state: PossessionState; playerIndex: number | null };
  lastTouch: Touch | null;
  previousTouch: Touch | null;
};

export const createBallPossession = (): BallPossession => ({
  owner: { state: "loose", playerIndex: null },
  lastTouch: null,
  previousTouch: null,
});

const stateFor = (team: TeamId, role: string): PossessionState => {
  if (role === "GK") return "goalkeeper";
  return team === "home" ? "blue" : "red";
};

export const recordTouch = (
  possession: BallPossession,
  playerIndex: number,
  team: TeamId,
  role: string,
  at: number,
  position: { x: number; z: number },
) => {
  const touch: Touch = { playerIndex, team, role, at, position };
  possession.previousTouch = possession.lastTouch;
  possession.lastTouch = touch;
  possession.owner = { state: stateFor(team, role), playerIndex };
  return touch;
};

export const setLoose = (possession: BallPossession) => {
  possession.owner = { state: "loose", playerIndex: null };
};
