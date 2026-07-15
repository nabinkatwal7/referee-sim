import type { RapierRigidBody } from "@react-three/rapier";
import type { TeamId } from "../../engine/team/Team";
import type { Pos2 } from "../Ball/nearestPlayer";
import { predictBallPosition, timeToNearPoint } from "./ballPrediction";
import type { PlayerAIState } from "./ai";
import type { TacticalParams } from "./tactics";
import { DEFAULT_TACTICS } from "./tactics";
import { dynamicShapeTarget, shapePhaseFor, type PlayerAnchors } from "./positioning";

// Step 31 — Defensive AI (+ 33/36/37 shape & intercept).
// Track → Intercept pass → Press → Tackle → Recover.
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
  anchors: PlayerAnchors;
  ball: Pos2;
  ballVel: Pos2;
  carrier: Pos2 | null;
  /** Predicted receiver / pass target if a ball is in flight toward a mate. */
  passTarget: Pos2 | null;
  mark: Pos2 | null;
  attackDir: 1 | -1;
  hasBallTeam: TeamId | null;
  ownTeam: TeamId;
  tactics: TacticalParams;
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

const markingSpot = (mark: Pos2, attackDir: 1 | -1): Pos2 => ({
  x: mark.x,
  z: mark.z - attackDir * MARK_OFFSET,
});

export const chooseDefendPhase = (ctx: DefendContext): DefendPhase => {
  const opponentHasBall = ctx.hasBallTeam !== null && ctx.hasBallTeam !== ctx.ownTeam;
  const loose = ctx.hasBallTeam === null;
  const ballSpeed = Math.hypot(ctx.ballVel.x, ctx.ballVel.z);
  const pressDist = 8 + ctx.tactics.pressing * 6;

  if (opponentHasBall && ctx.carrier) {
    const distCarrier = Math.hypot(ctx.carrier.x - ctx.self.x, ctx.carrier.z - ctx.self.z);
    if (distCarrier < TACKLE_RANGE) return "tackle";
    if (distCarrier < pressDist) return "press";
    // Step 37 — pass in flight toward mark → intercept.
    if (ctx.passTarget && ballSpeed > 3) return "intercept";
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
    const future = predictBallPosition(ctx.ball, ctx.ballVel, 0.5);
    const distBall = Math.hypot(future.x - ctx.self.x, future.z - ctx.self.z);
    if (distBall < 12 && ballSpeed > 2) return "intercept";
    return "recover";
  }

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

  const pressMul = 0.85 + ctx.tactics.pressing * 0.4;

  switch (phase) {
    case "track": {
      if (ctx.mark) moveToward(body, ctx.self, markingSpot(ctx.mark, ctx.attackDir), TRACK_SPEED);
      else if (ctx.carrier) moveToward(body, ctx.self, ctx.carrier, TRACK_SPEED);
      else setVel(body, 0, 0);
      return { kind: "none", phase };
    }
    case "intercept": {
      // Step 36/37 — run to where the ball (or pass) will be.
      const aim = ctx.passTarget ?? ctx.mark ?? ctx.carrier ?? ctx.ball;
      const t = timeToNearPoint(ctx.ball, ctx.ballVel, aim);
      const future = predictBallPosition(ctx.ball, ctx.ballVel, Math.max(0.25, t));
      moveToward(body, ctx.self, future, INTERCEPT_SPEED * pressMul);
      return { kind: "none", phase };
    }
    case "press": {
      if (ctx.carrier) {
        const futureCarrier = {
          x: ctx.carrier.x + (ctx.ballVel.x > 0 ? 0 : 0),
          z: ctx.carrier.z,
        };
        moveToward(body, ctx.self, futureCarrier, PRESS_SPEED * pressMul);
      } else {
        const future = predictBallPosition(ctx.ball, ctx.ballVel, 0.35);
        moveToward(body, ctx.self, future, PRESS_SPEED * pressMul);
      }
      return { kind: "none", phase };
    }
    case "tackle": {
      if (ctx.carrier) moveToward(body, ctx.self, ctx.carrier, PRESS_SPEED * pressMul);
      return { kind: "tackle", phase: "tackle" };
    }
    case "recover": {
      const ownHas = ctx.hasBallTeam === ctx.ownTeam;
      const oppHas = ctx.hasBallTeam !== null && ctx.hasBallTeam !== ctx.ownTeam;
      const target = dynamicShapeTarget(
        ctx.anchors,
        ctx.ball,
        ctx.attackDir,
        shapePhaseFor(ownHas, oppHas),
        ctx.tactics,
      );
      moveToward(body, ctx.self, target, RECOVER_SPEED);
      return { kind: "none", phase };
    }
  }
};

export const pickMarkTarget = (
  self: Pos2,
  opponents: { pos: Pos2 }[],
  attackDir: 1 | -1,
): Pos2 | null => {
  let best: Pos2 | null = null;
  let bestScore = -Infinity;
  for (const o of opponents) {
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

export { DEFAULT_TACTICS };
