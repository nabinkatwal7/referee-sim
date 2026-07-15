import type { TeamId } from "../../engine/team/Team";

// Who owns the ball, categorically: nobody (Loose), one team's outfield
// players (Blue = home, Red = away — matches our team colors), or
// specifically a goalkeeper (regardless of which team, since a keeper
// holding it is its own distinct situation — usually a save or back-pass).
export type PossessionState = "loose" | "blue" | "red" | "goalkeeper";

export type Touch = {
  playerIndex: number;
  team: TeamId;
  role: string;
  at: number; // match clock, seconds
};

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

// A player has just gained the ball (pickup, pass reception, tackle win) —
// shifts the touch history and updates the categorical owner.
export const recordTouch = (
  possession: BallPossession,
  playerIndex: number,
  team: TeamId,
  role: string,
  at: number,
) => {
  possession.previousTouch = possession.lastTouch;
  possession.lastTouch = { playerIndex, team, role, at };
  possession.owner = { state: stateFor(team, role), playerIndex };
};

// The ball has left anyone's control (a pass/shot in flight) — nobody owns
// it until it's next picked up.
export const setLoose = (possession: BallPossession) => {
  possession.owner = { state: "loose", playerIndex: null };
};
