import { MathUtils } from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { PITCH_LENGTH } from "../../components/game/pitchDimensions";
import { enterReactionState, type PlayerAIState } from "./ai";

const PICKUP_RADIUS = 6; // generous — players wander independently, not toward the ball
const SETTLE_SPEED = 1.5; // ball must be slower than this to be "received"
const MIN_HOLD = 1.2; // seconds a possessor waits before acting
const MAX_HOLD = 2.5;
const MIN_PASS_SPEED = 6;
const MAX_PASS_SPEED = 14;

const SHOOT_RANGE = 30; // start considering a shot within this distance of the opponent goal
const SHOOT_PROBABILITY = 0.5;
const SHOT_SPEED = 16;
const GOAL_PROBABILITY = 0.3; // very primitive stand-in for real goal-line detection

const TACKLE_RANGE = 3;
const TACKLE_WIN_PROBABILITY = 0.4;

const REACTION_DURATION = 0.5; // brief pass/shoot/tackle flash
const CELEBRATE_DURATION = 3;

const OWN_GOAL_LINE = PITCH_LENGTH / 2;

export type Team = "A" | "B";

export type PlayerRef = {
  body: RapierRigidBody;
  team: Team;
  ai: PlayerAIState;
};

export type BrainState = {
  possessor: number | null;
  holdTimer: number;
};

export const createBrainState = (): BrainState => ({ possessor: null, holdTimer: 0 });

const randomHold = () => MIN_HOLD + Math.random() * (MAX_HOLD - MIN_HOLD);

export type MatchEvent =
  | { kind: "pass"; from: number; to: number }
  | { kind: "shot"; by: number; team: Team; scored: boolean }
  | { kind: "tackle"; by: number; from: number };

const opponentGoalZ = (team: Team) => (team === "A" ? OWN_GOAL_LINE : -OWN_GOAL_LINE);

// Idle -> Move -> Receive -> Pass -> Shoot -> Tackle -> Celebrate, for
// whichever players the ball touches this tick. Deliberately simple: a kick
// aims at wherever the target is right now, a shot's outcome is a coin flip
// (there's no real goal-line sensor), and a tackle is a single roll against
// the nearest opponent the instant the ball is picked up.
export const stepMatchBrain = (
  ball: RapierRigidBody,
  players: (PlayerRef | null)[],
  state: BrainState,
  delta: number,
): MatchEvent | null => {
  const ballPos = ball.translation();
  const ballVel = ball.linvel();
  const ballSpeed = Math.hypot(ballVel.x, ballVel.z);

  if (state.possessor === null) {
    if (ballSpeed >= SETTLE_SPEED) return null;

    let nearest: number | null = null;
    let nearestDist = PICKUP_RADIUS;
    players.forEach((player, i) => {
      if (!player) return;
      const p = player.body.translation();
      const dist = Math.hypot(p.x - ballPos.x, p.z - ballPos.z);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    if (nearest === null) return null;
    const receiverIndex: number = nearest;

    const receiver = players[receiverIndex]!;
    let winnerIndex: number = receiverIndex;
    let tackleEvent: MatchEvent | null = null;

    players.forEach((player, i) => {
      if (!player || i === receiverIndex || player.team === receiver.team) return;
      const p = player.body.translation();
      const dist = Math.hypot(p.x - ballPos.x, p.z - ballPos.z);
      if (dist < TACKLE_RANGE && Math.random() < TACKLE_WIN_PROBABILITY) {
        winnerIndex = i;
        tackleEvent = { kind: "tackle", by: i, from: receiverIndex };
        enterReactionState(player.ai, "tackle", REACTION_DURATION);
      }
    });

    state.possessor = winnerIndex;
    state.holdTimer = randomHold();
    enterReactionState(players[winnerIndex]!.ai, "receive", state.holdTimer);
    return tackleEvent;
  }

  state.holdTimer -= delta;
  if (state.holdTimer > 0) return null;

  const possessor = players[state.possessor];
  if (!possessor) {
    state.possessor = null;
    return null;
  }
  const from = state.possessor;

  const goalZ = opponentGoalZ(possessor.team);
  const distToGoal = Math.hypot(ballPos.x, ballPos.z - goalZ);

  if (distToGoal < SHOOT_RANGE && Math.random() < SHOOT_PROBABILITY) {
    const dx = -ballPos.x;
    const dz = goalZ - ballPos.z;
    const dist = Math.hypot(dx, dz) || 1;
    ball.setLinvel({ x: (dx / dist) * SHOT_SPEED, y: 3, z: (dz / dist) * SHOT_SPEED }, true);

    const scored = Math.random() < GOAL_PROBABILITY;
    enterReactionState(
      possessor.ai,
      scored ? "celebrate" : "shoot",
      scored ? CELEBRATE_DURATION : REACTION_DURATION,
    );

    state.possessor = null;
    return { kind: "shot", by: from, team: possessor.team, scored };
  }

  const candidates = players
    .map((player, i) =>
      player && i !== state.possessor && player.team === possessor.team ? i : null,
    )
    .filter((i): i is number => i !== null);

  if (candidates.length === 0) {
    state.possessor = null;
    return null;
  }

  const receiverIndex = candidates[Math.floor(Math.random() * candidates.length)];
  const receiver = players[receiverIndex]!;

  const receiverPos = receiver.body.translation();
  const dx = receiverPos.x - ballPos.x;
  const dz = receiverPos.z - ballPos.z;
  const distance = Math.hypot(dx, dz) || 1;
  const speed = MathUtils.clamp(distance * 0.5, MIN_PASS_SPEED, MAX_PASS_SPEED);

  ball.setLinvel({ x: (dx / distance) * speed, y: 2, z: (dz / distance) * speed }, true);
  enterReactionState(possessor.ai, "pass", REACTION_DURATION);

  state.possessor = null;
  return { kind: "pass", from, to: receiverIndex };
};
