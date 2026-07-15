import type { RapierRigidBody } from "@react-three/rapier";
import type { TeamId } from "../../engine/team/Team";
import type { Pos2 } from "../Ball/nearestPlayer";
import { applySteering, spacedApproachTarget } from "./avoidance";
import { predictBallPosition, timeToNearPoint } from "./ballPrediction";
import type { PlayerAIState } from "./ai";
import { dynamicShapeTarget, shapePhaseFor, type PlayerAnchors } from "./positioning";
import { staminaSpeedFactor } from "./stamina";
import type { TacticalParams } from "./tactics";
import { DEFAULT_TACTICS } from "./tactics";

// Step 31 — Defensive AI (+ 33/36/37 shape & intercept).
// Track → Intercept pass → Press → Tackle → Recover.
// Goalkeepers never call this.

export type DefendPhase = "track" | "intercept" | "press" | "tackle" | "recover";

const PRESS_SPEED = 5.5;
const TRACK_SPEED = 4;
const RECOVER_SPEED = 4.5;
const INTERCEPT_SPEED = 5.8;
const TACKLE_RANGE = 2.6;
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
  neighbors: Pos2[];
  /** Only the closest few teammates may press / intercept the ball. */
  allowChase: boolean;
  /** 0 = first man in; 1+ = support angle. */
  chaseRank: number;
  /** Stable left/right lane so pressers don't stack. */
  chaseSide: 1 | -1;
};

export type DefendResult =
  | { kind: "none"; phase: DefendPhase }
  | { kind: "tackle"; phase: "tackle" };

const moveToward = (
  body: RapierRigidBody,
  self: Pos2,
  target: Pos2,
  speed: number,
  neighbors: Pos2[],
  staminaMul: number,
) => {
  const dx = target.x - self.x;
  const dz = target.z - self.z;
  applySteering(body, { x: dx, z: dz }, speed * staminaMul, neighbors);
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
    // Only first man engages the tackle — support holds the angle.
    if (ctx.allowChase && ctx.chaseRank === 0 && distCarrier < TACKLE_RANGE) return "tackle";
    if (ctx.allowChase && distCarrier < pressDist) return "press";
    if (ctx.allowChase && ctx.chaseRank === 0 && ctx.passTarget && ballSpeed > 3) {
      return "intercept";
    }
    if (ctx.allowChase && ctx.chaseRank === 0 && ctx.mark && ballSpeed > 3) {
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
    if (ctx.allowChase && distBall < 12 && ballSpeed > 2) return "intercept";
    if (ctx.allowChase && distBall < 10) return "press";
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
  // ponytail: keep tackle as press-driven until enterReactionState wins the ball —
  // setting "tackle" here with timer 0 freezes the runner every frame in FREEZE_STATES.
  if (phase === "press" || phase === "tackle" || phase === "intercept") ai.fsmState = "press";
  else if (phase === "recover") ai.fsmState = "recover";
  else ai.fsmState = "move";

  const pressMul = 0.85 + ctx.tactics.pressing * 0.4;
  const stam = staminaSpeedFactor(ai.stamina);
  const n = ctx.neighbors;

  const focus = ctx.carrier ?? ctx.ball;
  const spaced = spacedApproachTarget(ctx.self, focus, n, ctx.chaseSide, ctx.chaseRank);

  switch (phase) {
    case "track": {
      if (ctx.mark) moveToward(body, ctx.self, markingSpot(ctx.mark, ctx.attackDir), TRACK_SPEED, n, stam);
      else if (ctx.carrier) moveToward(body, ctx.self, spaced, TRACK_SPEED, n, stam);
      else body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
      return { kind: "none", phase };
    }
    case "intercept": {
      const aim = ctx.passTarget ?? ctx.mark ?? spaced;
      const t = timeToNearPoint(ctx.ball, ctx.ballVel, aim);
      const future = predictBallPosition(ctx.ball, ctx.ballVel, Math.max(0.25, t));
      const interceptAim = spacedApproachTarget(
        ctx.self,
        future,
        n,
        ctx.chaseSide,
        ctx.chaseRank,
      );
      moveToward(body, ctx.self, interceptAim, INTERCEPT_SPEED * pressMul, n, stam);
      return { kind: "none", phase };
    }
    case "press": {
      moveToward(body, ctx.self, spaced, PRESS_SPEED * pressMul, n, stam);
      return { kind: "none", phase };
    }
    case "tackle": {
      // Jockey into the shoulder, not through the torso.
      const shoulder = spacedApproachTarget(ctx.self, focus, n, ctx.chaseSide, 0);
      moveToward(body, ctx.self, shoulder, PRESS_SPEED * pressMul * 1.05, n, stam);
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
      moveToward(body, ctx.self, target, RECOVER_SPEED, n, stam);
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
