import type { RapierRigidBody } from "@react-three/rapier";
import type { TeamId } from "../../engine/team/Team";
import type { Pos2 } from "../Ball/nearestPlayer";
import type { PlayerAIState } from "./ai";

// Step 31 — Defensive AI (field players only).
// Track opponent → Intercept pass → Press → Tackle → Recover.
// Goalkeepers never call this.

export type DefendPhase = "track" | "intercept" | "press" | "tackle" | "recover";

const PRESS_SPEED = 5.5;
const TRACK_SPEED = 4;
const RECOVER_SPEED = 4.5;
const INTERCEPT_SPEED = 5.8;
const TACKLE_RANGE = 2.4;
const MARK_OFFSET = 2.5;

export type DefendContext = {
  self: Pos2;
  home: Pos2;
  ball: Pos2;
  ballVel: Pos2;
  /** Opponent with the ball, if any. */
  carrier: Pos2 | null;
  /** Mark target — nearest dangerous opponent. */
  mark: Pos2 | null;
  attackDir: 1 | -1; // our attacking direction (own goal is opposite)
  hasBallTeam: TeamId | null; // who owns the ball right now
  ownTeam: TeamId;
};

export type DefendResult =
  | { kind: "none"; phase: DefendPhase }
  | { kind: "tackle"; phase: "tackle" };

const setVel = (body: RapierRigidBody, x: number, z: number) => {
  const y = body.linvel().y;
  body.setLinvel({ x, y, z }, true);
};

const moveToward = (
  body: RapierRigidBody,
  self: Pos2,
  target: Pos2,
  speed: number,
) => {
  const dx = target.x - self.x;
  const dz = target.z - self.z;
  const len = Math.hypot(dx, dz) || 1;
  setVel(body, (dx / len) * speed, (dz / len) * speed);
};

/** Point on the ball→carrier/mark lane to cut a pass. */
const interceptPoint = (ball: Pos2, target: Pos2, self: Pos2): Pos2 => {
  const dx = target.x - ball.x;
  const dz = target.z - ball.z;
  // Aim at ~halfway along the lane, biased toward wherever we already are.
  const mid = { x: ball.x + dx * 0.45, z: ball.z + dz * 0.45 };
  const toMid = Math.hypot(mid.x - self.x, mid.z - self.z);
  if (toMid < 1) return mid;
  return mid;
};

const markingSpot = (mark: Pos2, attackDir: 1 | -1): Pos2 => ({
  // Stand goal-side of the opponent.
  x: mark.x,
  z: mark.z - attackDir * MARK_OFFSET,
});

export const chooseDefendPhase = (ctx: DefendContext): DefendPhase => {
  const opponentHasBall = ctx.hasBallTeam !== null && ctx.hasBallTeam !== ctx.ownTeam;
  const loose = ctx.hasBallTeam === null;
  const ballSpeed = Math.hypot(ctx.ballVel.x, ctx.ballVel.z);

  if (opponentHasBall && ctx.carrier) {
    const distCarrier = Math.hypot(ctx.carrier.x - ctx.self.x, ctx.carrier.z - ctx.self.z);
    if (distCarrier < TACKLE_RANGE) return "tackle";
    if (distCarrier < 10) return "press";
    // Ball moving toward a marked man → cut the lane.
    if (ctx.mark && ballSpeed > 3) {
      const closing =
        (ctx.ballVel.x * (ctx.mark.x - ctx.ball.x) +
          ctx.ballVel.z * (ctx.mark.z - ctx.ball.z)) /
        (Math.hypot(ctx.mark.x - ctx.ball.x, ctx.mark.z - ctx.ball.z) || 1);
      if (closing > 2) return "intercept";
    }
    return "track";
  }

  if (loose) {
    const distBall = Math.hypot(ctx.ball.x - ctx.self.x, ctx.ball.z - ctx.self.z);
    if (distBall < 12 && ballSpeed > 2) return "intercept";
    return "recover";
  }

  // Our team has the ball — soft recover toward shape.
  return "recover";
};

export const stepDefendAI = (
  body: RapierRigidBody,
  ai: PlayerAIState,
  ctx: DefendContext,
): DefendResult => {
  const phase = chooseDefendPhase(ctx);
  if (phase === "press") ai.fsmState = "press";
  else if (phase === "recover") ai.fsmState = "recover";
  else if (phase === "tackle") ai.fsmState = "tackle";
  else ai.fsmState = "move";

  switch (phase) {
    case "track": {
      if (ctx.mark) moveToward(body, ctx.self, markingSpot(ctx.mark, ctx.attackDir), TRACK_SPEED);
      else if (ctx.carrier) moveToward(body, ctx.self, ctx.carrier, TRACK_SPEED);
      else setVel(body, 0, 0);
      return { kind: "none", phase };
    }
    case "intercept": {
      const target = ctx.mark ?? ctx.carrier ?? ctx.ball;
      const point = interceptPoint(ctx.ball, target, ctx.self);
      moveToward(body, ctx.self, point, INTERCEPT_SPEED);
      return { kind: "none", phase };
    }
    case "press": {
      if (ctx.carrier) moveToward(body, ctx.self, ctx.carrier, PRESS_SPEED);
      else moveToward(body, ctx.self, ctx.ball, PRESS_SPEED);
      return { kind: "none", phase };
    }
    case "tackle": {
      if (ctx.carrier) moveToward(body, ctx.self, ctx.carrier, PRESS_SPEED);
      return { kind: "tackle", phase: "tackle" };
    }
    case "recover": {
      const backZ = ctx.home.z - ctx.attackDir * 2;
      const target = {
        x: ctx.home.x * 0.7 + ctx.ball.x * 0.3,
        z: backZ * 0.6 + ctx.home.z * 0.4,
      };
      moveToward(body, ctx.self, target, RECOVER_SPEED);
      return { kind: "none", phase };
    }
  }
};

/** Nearest opponent ahead of our goal (most advanced threat). */
export const pickMarkTarget = (
  self: Pos2,
  opponents: { pos: Pos2 }[],
  attackDir: 1 | -1,
): Pos2 | null => {
  let best: Pos2 | null = null;
  let bestScore = -Infinity;
  for (const o of opponents) {
    // Prefer opponents closer to our goal (negative attack advancement).
    const threat = -o.pos.z * attackDir;
    const dist = Math.hypot(o.pos.x - self.x, o.pos.z - self.z);
    const score = threat * 2 - dist;
    if (score > bestScore) {
      bestScore = score;
      best = o.pos;
    }
  }
  return best;
};
