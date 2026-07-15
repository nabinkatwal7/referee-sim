import type { TeamId } from "../team/Team";

export type Team = TeamId;
export type Vec2 = { x: number; z: number };

type Base = { at: number }; // match clock, seconds

export type PassEvent = Base & { kind: "pass"; from: number; to: number };
export type TackleEvent = Base & { kind: "tackle"; by: number; from: number };
export type ShotEvent = Base & { kind: "shot"; by: number; team: Team; scored: boolean };
export type GoalEvent = Base & { kind: "goal"; by: number; team: Team };
export type CollisionEvent = Base & { kind: "collision"; position: Vec2 };
export type ThrowInEvent = Base & { kind: "throwIn"; team: Team; position: Vec2 };
export type CornerEvent = Base & { kind: "corner"; team: Team; position: Vec2 };

// The judgment calls: something happened (ground truth), and separately the
// referee either saw it well enough to call it correctly or didn't —
// see engine/referee/vision.ts. `given` is the referee's actual decision.
export type FoulEvent = Base & {
  kind: "foul";
  by: number;
  against: number;
  position: Vec2;
  given: boolean;
  visionQuality: number;
};

export type PenaltyEvent = Base & {
  kind: "penalty";
  by: number;
  against: number;
  team: Team; // team awarded the penalty
  position: Vec2;
  given: boolean;
  visionQuality: number;
};

export type OffsideEvent = Base & {
  kind: "offside";
  by: number;
  team: Team;
  position: Vec2;
  given: boolean;
  visionQuality: number;
};

// Player collision, no ball involved, high force -> the engine flags it but
// does NOT decide anything. No `given` field here: this is handed to the
// human player via the Whistle System (engine/referee/whistle.ts) instead of
// being auto-resolved like Foul/Penalty/Offside.
export type PossibleFoulEvent = Base & {
  kind: "possibleFoul";
  playerA: number;
  playerB: number;
  position: Vec2;
  force: number;
  severity: "clean" | "foul" | "reckless";
  visionQuality: number;
};

export type MatchEvent =
  | PassEvent
  | TackleEvent
  | ShotEvent
  | GoalEvent
  | CollisionEvent
  | ThrowInEvent
  | CornerEvent
  | FoulEvent
  | PenaltyEvent
  | OffsideEvent
  | PossibleFoulEvent;
