import type { TeamId } from "../team/Team";

export type Team = TeamId;
export type Vec2 = { x: number; z: number };

type Base = { at: number }; // match clock, seconds

export type PassEvent = Base & { kind: "pass"; from: number; to: number };
export type TackleEvent = Base & {
  kind: "tackle";
  by: number;
  from: number;
  speed?: number;
  angle?: number;
  force?: number;
  ballTouched?: boolean;
  legTouched?: boolean;
};

export type ShotEvent = Base & { kind: "shot"; by: number; team: Team; scored: boolean };
export type GoalEvent = Base & { kind: "goal"; by: number; team: Team };
export type CollisionEvent = Base & { kind: "collision"; position: Vec2 };
export type ThrowInEvent = Base & { kind: "throwIn"; team: Team; position: Vec2 };
export type CornerEvent = Base & { kind: "corner"; team: Team; position: Vec2 };
export type GoalKickEvent = Base & { kind: "goalKick"; team: Team; position: Vec2 };
export type KickoffEvent = Base & { kind: "kickoff" };

export type FoulEvent = Base & {
  kind: "foul";
  by: number;
  against: number;
  position: Vec2;
  given: boolean;
  visionQuality: number;
  foulScore?: number;
};

export type PenaltyEvent = Base & {
  kind: "penalty";
  by: number;
  against: number;
  team: Team;
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

export type PossibleFoulEvent = Base & {
  kind: "possibleFoul";
  playerA: number;
  playerB: number;
  position: Vec2;
  force: number;
  foulScore: number;
  severity: "clean" | "foul" | "reckless";
  visionQuality: number;
  tackle?: {
    speed: number;
    angle: number;
    force: number;
    ballTouched: boolean;
    legTouched: boolean;
  };
};

export type AdvantageExpiredEvent = Base & {
  kind: "advantageExpired";
  playerA: number;
  playerB: number;
};


export type MatchEvent =
  | PassEvent
  | TackleEvent
  | ShotEvent
  | GoalEvent
  | CollisionEvent
  | ThrowInEvent
  | CornerEvent
  | GoalKickEvent
  | KickoffEvent
  | FoulEvent
  | PenaltyEvent
  | OffsideEvent
  | PossibleFoulEvent
  | AdvantageExpiredEvent;
