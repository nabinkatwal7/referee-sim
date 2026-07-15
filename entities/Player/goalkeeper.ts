import type { RapierRigidBody } from "@react-three/rapier";
import {
  GOAL_WIDTH,
  PENALTY_BOX_DEPTH,
  PENALTY_BOX_WIDTH,
  PITCH_LENGTH,
} from "../../components/game/pitchDimensions";
import type { Team } from "../../engine/team/Team";
import type { Pos2 } from "../Ball/nearestPlayer";

// Goalkeeper AI — SEPARATE state machine. Never reuse field-player wander /
// decide / dribble logic. Idle → Track → Intercept → Dive → Catch → Kick.

export type KeeperFSMState =
  | "idle"
  | "track"
  | "intercept"
  | "dive"
  | "catch"
  | "kick";

export type GoalkeeperAIState = {
  home: [number, number, number];
  fsmState: KeeperFSMState;
  stateTimer: number;
  /** Ball held after a catch, before clearance kick. */
  holdTimer: number;
};

const TRACK_SPEED = 3.2;
const INTERCEPT_SPEED = 6.5;
const DIVE_SPEED = 9;
const CATCH_RADIUS = 2.2;
const DIVE_RADIUS = 5;
const HOLD_TIME = 0.7;
const KICK_TIME = 0.45;
const OWN_GOAL_LINE = PITCH_LENGTH / 2;
const GOAL_HALF = GOAL_WIDTH / 2;

export const createGoalkeeperAIState = (
  home: [number, number, number],
): GoalkeeperAIState => ({
  home,
  fsmState: "idle",
  stateTimer: 0,
  holdTimer: 0,
});

export type KeeperEvent =
  | { kind: "caught" }
  | { kind: "cleared"; to: number | null };

const ownGoalZ = (team: Team) => -team.attackingDirection * OWN_GOAL_LINE;

const inOwnBox = (pos: Pos2, team: Team): boolean => {
  if (Math.abs(pos.x) > PENALTY_BOX_WIDTH / 2) return false;
  const gz = ownGoalZ(team);
  return team.attackingDirection === 1
    ? pos.z >= gz && pos.z <= gz + PENALTY_BOX_DEPTH
    : pos.z <= gz && pos.z >= gz - PENALTY_BOX_DEPTH;
};

const ballThreatening = (ball: Pos2, ballVel: Pos2, team: Team): boolean => {
  const gz = ownGoalZ(team);
  const towardGoal = (gz - ball.z) * -team.attackingDirection > 0
    ? ballVel.z * -team.attackingDirection
    : 0;
  // Coming at our goal, or already deep in our half near the box.
  const inDangerHalf =
    team.attackingDirection === 1 ? ball.z < -10 : ball.z > 10;
  return (towardGoal > 2 && inDangerHalf) || inOwnBox(ball, team);
};

const setVel = (body: RapierRigidBody, x: number, z: number) => {
  const y = body.linvel().y;
  body.setLinvel({ x, y, z }, true);
};

const clampToGoalLine = (x: number, _z: number, team: Team): Pos2 => {
  const gz = ownGoalZ(team) + team.attackingDirection * 1.5;
  return {
    x: Math.max(-GOAL_HALF - 1, Math.min(GOAL_HALF + 1, x)),
    z: gz,
  };
};

/** Project ball forward a bit for intercept aiming. */
const predictBall = (ball: Pos2, vel: Pos2, dt = 0.45): Pos2 => ({
  x: ball.x + vel.x * dt,
  z: ball.z + vel.z * dt,
});

export const stepGoalkeeper = (
  body: RapierRigidBody,
  ai: GoalkeeperAIState,
  team: Team,
  ball: RapierRigidBody,
  holding: boolean, // brain.possessor === this keeper
  teammates: { index: number; pos: Pos2 }[],
  delta: number,
): KeeperEvent | null => {
  const pos = body.translation();
  const self: Pos2 = { x: pos.x, z: pos.z };
  const bt = ball.translation();
  const bv = ball.linvel();
  const ballXZ: Pos2 = { x: bt.x, z: bt.z };
  const ballVel: Pos2 = { x: bv.x, z: bv.z };
  const ballSpeed = Math.hypot(bv.x, bv.z);
  const dist = Math.hypot(ballXZ.x - self.x, ballXZ.z - self.z);

  // —— Catch / Kick when we already hold the ball ——
  if (holding || ai.fsmState === "catch" || ai.fsmState === "kick") {
    if (ai.fsmState === "kick") {
      ai.stateTimer -= delta;
      setVel(body, 0, 0);
      if (ai.stateTimer <= 0) {
        ai.fsmState = "idle";
      }
      return null;
    }

    // Holding after catch
    if (ai.fsmState !== "catch") {
      ai.fsmState = "catch";
      ai.holdTimer = HOLD_TIME;
    }

    ai.holdTimer -= delta;
    setVel(body, 0, 0);
    // Keep ball in hands (no player teleport — ball follows GK).
    ball.setTranslation({ x: self.x, y: 1.2, z: self.z + team.attackingDirection * 0.4 }, true);
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true);

    if (ai.holdTimer > 0) return holding ? null : { kind: "caught" };

    // Clear upfield — prefer a teammate ahead, else boot long.
    ai.fsmState = "kick";
    ai.stateTimer = KICK_TIME;

    let to: number | null = null;
    let bestForward = -Infinity;
    for (const t of teammates) {
      const fwd = (t.pos.z - self.z) * team.attackingDirection;
      if (fwd > bestForward) {
        bestForward = fwd;
        to = t.index;
      }
    }

    if (to !== null) {
      const target = teammates.find((t) => t.index === to)!.pos;
      const dx = target.x - self.x;
      const dz = target.z - self.z;
      const len = Math.hypot(dx, dz) || 1;
      const speed = 12;
      ball.setLinvel({ x: (dx / len) * speed, y: 3, z: (dz / len) * speed }, true);
    } else {
      ball.setLinvel(
        { x: (Math.random() - 0.5) * 4, y: 4, z: team.attackingDirection * 14 },
        true,
      );
    }
    return { kind: "cleared", to };
  }

  // Timed dive finishes → idle (missed)
  if (ai.fsmState === "dive") {
    ai.stateTimer -= delta;
    if (ai.stateTimer <= 0) {
      ai.fsmState = "idle";
      setVel(body, 0, 0);
    }
    // Still try to claim if we reach it mid-dive.
    if (dist < CATCH_RADIUS && ballSpeed < 14 && inOwnBox(ballXZ, team)) {
      ai.fsmState = "catch";
      ai.holdTimer = HOLD_TIME;
      return { kind: "caught" };
    }
    return null;
  }

  // —— Positioning / reaction when ball is free ——
  if (!ballThreatening(ballXZ, ballVel, team) && !inOwnBox(ballXZ, team)) {
    // Idle near home spot on the line.
    ai.fsmState = "idle";
    const home: Pos2 = { x: ai.home[0], z: ai.home[2] };
    const dx = home.x - self.x;
    const dz = home.z - self.z;
    if (Math.hypot(dx, dz) > 0.6) setVel(body, dx * 2, dz * 2);
    else setVel(body, 0, 0);
    return null;
  }

  // Dive: hot shot off to the side, close enough.
  const lateral = Math.abs(ballXZ.x - self.x);
  const closingFast = ballSpeed > 8 && ballThreatening(ballXZ, ballVel, team);
  if (closingFast && lateral > 1.5 && dist < DIVE_RADIUS && inOwnBox(ballXZ, team)) {
    ai.fsmState = "dive";
    ai.stateTimer = 0.55;
    const dirX = Math.sign(ballXZ.x - self.x) || 1;
    setVel(body, dirX * DIVE_SPEED, (ballXZ.z - self.z) * 2);
    return null;
  }

  // Catch if ball is on us in the box.
  if (dist < CATCH_RADIUS && ballSpeed < 12 && inOwnBox(ballXZ, team)) {
    ai.fsmState = "catch";
    ai.holdTimer = HOLD_TIME;
    setVel(body, 0, 0);
    return { kind: "caught" };
  }

  // Intercept: rush predicted point inside the box.
  if (inOwnBox(ballXZ, team) || (ballThreatening(ballXZ, ballVel, team) && dist < 18)) {
    const predicted = predictBall(ballXZ, ballVel);
    const target = inOwnBox(predicted, team)
      ? predicted
      : clampToGoalLine(predicted.x, predicted.z, team);
    ai.fsmState = "intercept";
    const dx = target.x - self.x;
    const dz = target.z - self.z;
    const len = Math.hypot(dx, dz) || 1;
    setVel(body, (dx / len) * INTERCEPT_SPEED, (dz / len) * INTERCEPT_SPEED);
    return null;
  }

  // Track: shuffle along the goal line with the ball's x.
  ai.fsmState = "track";
  const line = clampToGoalLine(ballXZ.x, self.z, team);
  const dx = line.x - self.x;
  const dz = line.z - self.z;
  if (Math.hypot(dx, dz) > 0.3) {
    setVel(
      body,
      Math.max(-TRACK_SPEED, Math.min(TRACK_SPEED, dx * 4)),
      Math.max(-TRACK_SPEED, Math.min(TRACK_SPEED, dz * 4)),
    );
  } else {
    setVel(body, 0, 0);
  }
  return null;
};
