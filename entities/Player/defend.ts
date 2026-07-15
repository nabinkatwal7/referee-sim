import type { RapierRigidBody } from "@react-three/rapier";
import type { TeamId } from "../../engine/team/Team";
import type { Role } from "../formation";
import type { Pos2 } from "../Ball/nearestPlayer";
import { applySteering, spacedApproachTarget } from "./avoidance";
import { predictBallPosition, timeToNearPoint } from "./ballPrediction";
import type { PlayerAIState } from "./ai";
import {
  gaitSpeed,
  interceptGait,
  pressGait,
  recoverGait,
  tackleGait,
  trackGait,
  type Gait,
} from "./gait";
import { dynamicShapeTarget, shapePhaseFor, type PlayerAnchors } from "./positioning";
import { staminaSpeedFactor } from "./stamina";
import type { TacticalParams } from "./tactics";
import { DEFAULT_TACTICS } from "./tactics";

// Step 31 — Defensive AI (+ 33/36/37 shape & intercept).
// Track → Intercept pass → Press → Tackle → Recover.
// Goalkeepers never call this.

export type DefendPhase = "track" | "intercept" | "press" | "tackle" | "recover";

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
  role: Role;
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
  gait: Gait,
  ai: PlayerAIState,
  neighbors: Pos2[],
) => {
  const dx = target.x - self.x;
  const dz = target.z - self.z;
  const speed = gaitSpeed(gait, ai.pace, staminaSpeedFactor(ai.stamina));
  if (speed < 0.2) {
    body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
    return;
  }
  applySteering(body, { x: dx, z: dz }, speed, neighbors);
};

/** Map gait → fsm so animations and wander don't all look identical. */
const applyPhaseFsm = (ai: PlayerAIState, phase: DefendPhase, gait: Gait) => {
  if (phase === "tackle" || phase === "intercept") {
    ai.fsmState = "press";
    return;
  }
  if (phase === "press") {
    ai.fsmState = gait === "sprint" || gait === "run" ? "press" : "move";
    return;
  }
  if (phase === "recover") {
    ai.fsmState = gait === "walk" || gait === "idle" ? "recover" : gait === "jog" ? "move" : "press";
    return;
  }
  // track
  ai.fsmState = gait === "idle" ? "idle" : "move";
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
  const n = ctx.neighbors;
  const focus = ctx.carrier ?? ctx.ball;
  const spaced = spacedApproachTarget(ctx.self, focus, n, ctx.chaseSide, ctx.chaseRank);

  switch (phase) {
    case "track": {
      const spot = ctx.mark
        ? markingSpot(ctx.mark, ctx.attackDir)
        : spaced;
      const gait = ctx.mark
        ? trackGait(ctx.self, spot, ctx.role)
        : trackGait(ctx.self, focus, ctx.role);
      applyPhaseFsm(ai, phase, gait);
      moveToward(body, ctx.self, spot, gait, ai, n);
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
      const gait = interceptGait();
      applyPhaseFsm(ai, phase, gait);
      moveToward(body, ctx.self, interceptAim, gait, ai, n);
      return { kind: "none", phase };
    }
    case "press": {
      const gait = pressGait(ctx.self, focus, ctx.chaseRank, ctx.role);
      applyPhaseFsm(ai, phase, gait);
      moveToward(body, ctx.self, spaced, gait, ai, n);
      return { kind: "none", phase };
    }
    case "tackle": {
      const shoulder = spacedApproachTarget(ctx.self, focus, n, ctx.chaseSide, 0);
      const gait = tackleGait();
      applyPhaseFsm(ai, phase, gait);
      moveToward(body, ctx.self, shoulder, gait, ai, n);
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
      const gait = recoverGait(ctx.self, target, ctx.role, ownHas);
      applyPhaseFsm(ai, phase, gait);
      moveToward(body, ctx.self, target, gait, ai, n);
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
