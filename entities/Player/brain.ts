import type { RapierRigidBody } from "@react-three/rapier";
import { MathUtils } from "three";
import { PENALTY_BOX_DEPTH, PENALTY_BOX_WIDTH, PITCH_LENGTH } from "../../components/game/pitchDimensions";
import type { Team, TeamId } from "../../engine/team/Team";
import type { Role } from "../formation";
import {
  canReceive,
  findNearestPlayer,
  type NearestPlayer,
  type Pos2,
} from "../Ball/nearestPlayer";
import { enterReactionState, type PlayerAIState } from "./ai";
import { decideAction } from "./decide";
import {
  pickMarkTarget,
  stepDefendAI,
} from "./defend";
import {
  applySteer,
  carryBallAhead,
  dribbleSteer,
  moveSteer,
} from "./dribble";
import {
  stepGoalkeeper,
  type GoalkeeperAIState,
} from "./goalkeeper";
import { approachBall, faceGoal, isBallArriving } from "./receive";

const MIN_PASS_SPEED = 6;
const MAX_PASS_SPEED = 14;

const TACKLE_RANGE = 3;
const FOUL_PROBABILITY = 0.25;
const TACKLE_WIN_PROBABILITY = 0.4;
const DEFEND_TACKLE_WIN = 0.35;

const REACTION_DURATION = 0.5;
const CELEBRATE_DURATION = 3;
const RECEIVE_FACE_TIME = 0.45;
const GOAL_PROBABILITY_BASE = 0.15; // scaled up by shot quality

const OWN_GOAL_LINE = PITCH_LENGTH / 2;

export type PlayerRef = {
  body: RapierRigidBody;
  team: Team;
  role: Role;
  ai: PlayerAIState;
  keeper: GoalkeeperAIState | null;
};

const isGK = (p: PlayerRef) => p.role === "GK" && p.keeper !== null;

export type BrainState = {
  possessor: number | null;
  /** Seconds left facing goal after a clean take. */
  receiveTimer: number;
  /** While > 0, stick to dribble/move — don't re-ask shoot/pass every frame. */
  commitTimer: number;
};

export const createBrainState = (): BrainState => ({
  possessor: null,
  receiveTimer: 0,
  commitTimer: 0,
});

export type MatchEvent =
  | { kind: "pass"; from: number; to: number }
  | { kind: "shot"; by: number; team: TeamId; scored: boolean }
  | { kind: "tackle"; by: number; from: number }
  | {
      kind: "foul";
      by: number;
      against: number;
      position: { x: number; z: number };
    }
  | {
      kind: "penalty";
      by: number;
      against: number;
      team: TeamId;
      position: { x: number; z: number };
    }
  | {
      kind: "offside";
      by: number;
      team: TeamId;
      position: { x: number; z: number };
    };

const isInOwnPenaltyBox = (pos: { x: number; z: number }, team: Team): boolean => {
  if (Math.abs(pos.x) > PENALTY_BOX_WIDTH / 2) return false;
  const ownGoalZ = -team.attackingDirection * OWN_GOAL_LINE;
  return team.attackingDirection === 1
    ? pos.z >= ownGoalZ && pos.z <= ownGoalZ + PENALTY_BOX_DEPTH
    : pos.z <= ownGoalZ && pos.z >= ownGoalZ - PENALTY_BOX_DEPTH;
};

const checkOffside = (
  players: (PlayerRef | null)[],
  attackingTeam: Team,
  receiverIndex: number,
  ballPos: { x: number; z: number },
): boolean => {
  const dir = attackingTeam.attackingDirection;
  const receiver = players[receiverIndex];
  if (!receiver) return false;

  const defenderAdvancement = players
    .filter((p): p is PlayerRef => !!p && p.team.id !== attackingTeam.id)
    .map((p) => p.body.translation().z * dir)
    .sort((a, b) => b - a);

  if (defenderAdvancement.length < 2) return false;

  const offsideLine = defenderAdvancement[1];
  const receiverAdvancement = receiver.body.translation().z * dir;
  const ballAdvancement = ballPos.z * dir;

  return receiverAdvancement > offsideLine && receiverAdvancement > ballAdvancement;
};

const posOf = (p: PlayerRef): Pos2 => {
  const t = p.body.translation();
  return { x: t.x, z: t.z };
};

const opponentPositions = (
  players: (PlayerRef | null)[],
  teamId: TeamId,
): Pos2[] => {
  const out: Pos2[] = [];
  for (const p of players) {
    if (p && p.team.id !== teamId) out.push(posOf(p));
  }
  return out;
};

const teammateEntries = (
  players: (PlayerRef | null)[],
  teamId: TeamId,
  selfIndex: number,
): { index: number; pos: Pos2 }[] => {
  const out: { index: number; pos: Pos2 }[] = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (!p || i === selfIndex || p.team.id !== teamId) continue;
    out.push({ index: i, pos: posOf(p) });
  }
  return out;
};

const opponentKeeperPos = (
  players: (PlayerRef | null)[],
  ownTeam: Team,
): Pos2 | null => {
  for (const p of players) {
    if (!p || p.team.id === ownTeam.id) continue;
    for (const tp of p.team.players) {
      if (tp.role !== "GK") continue;
      const gk = players[tp.index];
      return gk ? posOf(gk) : null;
    }
  }
  return null;
};

export const stepMatchBrain = (
  ball: RapierRigidBody,
  players: (PlayerRef | null)[],
  state: BrainState,
  delta: number,
  nearestToBall: NearestPlayer | null = null,
): MatchEvent | null => {
  const ballPos = ball.translation();
  const ballVel = ball.linvel();
  const ballSpeed = Math.hypot(ballVel.x, ballVel.z);
  const ballXZ: Pos2 = { x: ballPos.x, z: ballPos.z };
  const ballVelXZ: Pos2 = { x: ballVel.x, z: ballVel.z };

  // —— Goalkeepers (separate SM — never field-player logic) ——
  const keeperEvent = stepKeepers(ball, players, state, delta);
  if (keeperEvent) return keeperEvent;

  // GK still holding — field brain stays out, but outfielders still defend/shape.
  if (state.possessor !== null) {
    const holder = players[state.possessor];
    if (holder && isGK(holder)) {
      stepFieldDefense(ball, players, state, ballXZ, ballVelXZ);
      return null;
    }
  }

  // —— Loose ball: field approach → receive (GKs excluded) ——
  if (state.possessor === null) {
    const nearest = fieldNearest(players, ballXZ, nearestToBall);

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p && !isGK(p) && p.ai.fsmState === "receive" && i !== nearest?.index) {
        p.ai.fsmState = "move";
      }
    }

    if (nearest) {
      const candidate = players[nearest.index];
      if (candidate && !isGK(candidate)) {
        const p = posOf(candidate);
        if (isBallArriving(p, ballXZ, ballVelXZ) && !canReceive(ballSpeed, nearest.dist)) {
          approachBall(candidate.body, candidate.ai, ballXZ, ballVelXZ);
        }
      }
    }

    if (!nearest || !canReceive(ballSpeed, nearest.dist)) {
      stepFieldDefense(ball, players, state, ballXZ, ballVelXZ);
      return null;
    }

    const receiverIndex = nearest.index;
    const receiver = players[receiverIndex];
    if (!receiver || isGK(receiver)) {
      stepFieldDefense(ball, players, state, ballXZ, ballVelXZ);
      return null;
    }

    let winnerIndex = receiverIndex;
    let outcome: MatchEvent | null = null;

    players.forEach((player, i) => {
      if (outcome || !player || isGK(player) || i === receiverIndex || player.team.id === receiver.team.id) {
        return;
      }
      const p = player.body.translation();
      const dist = Math.hypot(p.x - ballPos.x, p.z - ballPos.z);
      if (dist >= TACKLE_RANGE) return;

      if (Math.random() < FOUL_PROBABILITY) {
        const position = { x: ballPos.x, z: ballPos.z };
        if (isInOwnPenaltyBox(position, player.team)) {
          outcome = {
            kind: "penalty",
            by: i,
            against: receiverIndex,
            team: receiver.team.id,
            position,
          };
        } else {
          outcome = { kind: "foul", by: i, against: receiverIndex, position };
        }
        return;
      }

      if (Math.random() < TACKLE_WIN_PROBABILITY) {
        winnerIndex = i;
        outcome = { kind: "tackle", by: i, from: receiverIndex };
        enterReactionState(player.ai, "tackle", REACTION_DURATION);
      }
    });

    state.possessor = winnerIndex;
    state.receiveTimer = RECEIVE_FACE_TIME;
    state.commitTimer = 0;
    const winner = players[winnerIndex]!;
    faceGoal(winner.body, winner.ai, winner.team.attackingDirection);
    return outcome;
  }

  const possessor = players[state.possessor];
  if (!possessor || isGK(possessor)) {
    state.possessor = null;
    return null;
  }
  const from = state.possessor;
  const attackDir = possessor.team.attackingDirection;
  const selfPos = posOf(possessor);
  const opponents = opponentPositions(players, possessor.team.id);

  // —— Just received: face goal, keep ball close (still no player teleport) ——
  if (state.receiveTimer > 0) {
    state.receiveTimer -= delta;
    faceGoal(possessor.body, possessor.ai, attackDir);
    const v = possessor.body.linvel();
    carryBallAhead(ball, selfPos, { x: -selfPos.x * 0.2, z: attackDir }, { x: v.x, z: v.z });
    if (state.receiveTimer <= 0) possessor.ai.fsmState = "dribble";
    stepFieldDefense(ball, players, state, ballXZ, ballVelXZ);
    return null;
  }

  // —— Step 26: decide shoot → pass → dribble → move ——
  state.commitTimer -= delta;
  const decision =
    state.commitTimer > 0
      ? ({ kind: "dribble" } as const)
      : decideAction({
          ball: ballXZ,
          attackDir,
          preferredFoot: possessor.ai.preferredFoot,
          teammates: teammateEntries(players, possessor.team.id, from).filter((t) => {
            const p = players[t.index];
            return p && !isGK(p); // outfield passes; GK clears via own SM
          }),
          opponents,
          keeperPos: opponentKeeperPos(players, possessor.team),
        });

  if (decision.kind === "shoot") {
    const { plan } = decision;
    ball.setLinvel(
      { x: plan.direction.x * plan.power, y: 2 + plan.quality * 2, z: plan.direction.z * plan.power },
      true,
    );
    ball.setAngvel({ x: 0, y: plan.spin * 8, z: 0 }, true);

    const scored = Math.random() < GOAL_PROBABILITY_BASE + plan.quality * 0.35;
    enterReactionState(
      possessor.ai,
      scored ? "celebrate" : "shoot",
      scored ? CELEBRATE_DURATION : REACTION_DURATION,
    );
    state.possessor = null;
    return { kind: "shot", by: from, team: possessor.team.id, scored };
  }

  if (decision.kind === "pass") {
    const receiverIndex = decision.target.index;
    const receiver = players[receiverIndex];
    if (!receiver) {
      state.possessor = null;
      return null;
    }

    const receiverPos = posOf(receiver);
    const dx = receiverPos.x - ballXZ.x;
    const dz = receiverPos.z - ballXZ.z;
    const distance = Math.hypot(dx, dz) || 1;
    const speed = MathUtils.clamp(distance * 0.5, MIN_PASS_SPEED, MAX_PASS_SPEED);

    ball.setLinvel({ x: (dx / distance) * speed, y: 2, z: (dz / distance) * speed }, true);
    enterReactionState(possessor.ai, "pass", REACTION_DURATION);
    state.possessor = null;

    if (checkOffside(players, possessor.team, receiverIndex, ballXZ)) {
      return {
        kind: "offside",
        by: receiverIndex,
        team: possessor.team.id,
        position: { x: ballXZ.x, z: ballXZ.z },
      };
    }
    return { kind: "pass", from, to: receiverIndex };
  }

  // Dribble / move: steer + carry ball ahead
  if (state.commitTimer <= 0) state.commitTimer = 0.75;
  const steer =
    decision.kind === "dribble"
      ? dribbleSteer(selfPos, attackDir, opponents)
      : moveSteer(selfPos, attackDir);

  applySteer(possessor.body, steer);
  possessor.ai.fsmState = "dribble";
  const v = possessor.body.linvel();
  carryBallAhead(ball, selfPos, steer, { x: v.x, z: v.z });

  const defendEvent = stepFieldDefense(ball, players, state, ballXZ, ballVelXZ);
  return defendEvent;
};

const fieldNearest = (
  players: (PlayerRef | null)[],
  ballXZ: Pos2,
  nearestToBall: NearestPlayer | null,
): NearestPlayer | null => {
  if (nearestToBall) {
    const p = players[nearestToBall.index];
    if (p && !isGK(p)) return nearestToBall;
  }
  return findNearestPlayer(ballXZ, players.length, (i) => {
    const player = players[i];
    if (!player || isGK(player)) return null;
    return posOf(player);
  });
};

const stepKeepers = (
  ball: RapierRigidBody,
  players: (PlayerRef | null)[],
  state: BrainState,
  delta: number,
): MatchEvent | null => {
  let event: MatchEvent | null = null;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (!p || !isGK(p) || !p.keeper) continue;

    const holding = state.possessor === i;
    const result = stepGoalkeeper(
      p.body,
      p.keeper,
      p.team,
      ball,
      holding,
      teammateEntries(players, p.team.id, i).filter((t) => {
        const mate = players[t.index];
        return mate && !isGK(mate);
      }),
      delta,
    );

    if (result?.kind === "caught") {
      state.possessor = i;
      state.receiveTimer = 0;
      state.commitTimer = 0;
    } else if (result?.kind === "cleared") {
      state.possessor = null;
      if (result.to !== null) {
        event = { kind: "pass", from: i, to: result.to };
      }
    }
  }

  return event;
};

/** Step 31 — defensive AI for every outfielder who doesn't have the ball. */
const stepFieldDefense = (
  _ball: RapierRigidBody,
  players: (PlayerRef | null)[],
  state: BrainState,
  ballXZ: Pos2,
  ballVelXZ: Pos2,
): MatchEvent | null => {
  const possessor = state.possessor !== null ? players[state.possessor] : null;
  const hasBallTeam = possessor?.team.id ?? null;
  const carrierPos = possessor && !isGK(possessor) ? posOf(possessor) : null;
  const carrierIndex = state.possessor;
  const passTarget = predictedPassTarget(players, ballXZ, ballVelXZ);

  let tackleEvent: MatchEvent | null = null;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (!p || isGK(p)) continue;
    if (i === state.possessor) continue;
    if (p.ai.fsmState === "pass" || p.ai.fsmState === "shoot" || p.ai.fsmState === "celebrate") {
      continue;
    }

    const self = posOf(p);
    const opponents: { pos: Pos2 }[] = [];
    for (const o of players) {
      if (o && o.team.id !== p.team.id && !isGK(o)) opponents.push({ pos: posOf(o) });
    }

    const roster = p.team.players.find((tp) => tp.index === i);
    const anchors = {
      home: { x: (roster?.home ?? p.ai.home)[0], z: (roster?.home ?? p.ai.home)[2] },
      attack: {
        x: (roster?.attack ?? p.ai.home)[0],
        z: (roster?.attack ?? p.ai.home)[2],
      },
      defend: {
        x: (roster?.defend ?? p.ai.home)[0],
        z: (roster?.defend ?? p.ai.home)[2],
      },
    };

    const result = stepDefendAI(p.body, p.ai, {
      self,
      anchors,
      ball: ballXZ,
      ballVel: ballVelXZ,
      carrier: carrierPos,
      passTarget,
      mark: pickMarkTarget(self, opponents, p.team.attackingDirection),
      attackDir: p.team.attackingDirection,
      hasBallTeam,
      ownTeam: p.team.id,
      tactics: p.team.tactics,
    });

    if (
      result.kind === "tackle" &&
      !tackleEvent &&
      carrierIndex !== null &&
      possessor &&
      possessor.team.id !== p.team.id &&
      Math.random() < DEFEND_TACKLE_WIN
    ) {
      enterReactionState(p.ai, "tackle", REACTION_DURATION);
      state.possessor = i;
      state.receiveTimer = RECEIVE_FACE_TIME;
      state.commitTimer = 0;
      faceGoal(p.body, p.ai, p.team.attackingDirection);
      tackleEvent = { kind: "tackle", by: i, from: carrierIndex };
    }
  }

  return tackleEvent;
};

/** Step 37 — who the loose/moving ball is heading toward (approx pass receiver). */
const predictedPassTarget = (
  players: (PlayerRef | null)[],
  ball: Pos2,
  ballVel: Pos2,
): Pos2 | null => {
  const speed = Math.hypot(ballVel.x, ballVel.z);
  if (speed < 4) return null;
  let best: Pos2 | null = null;
  let bestAlong = 2;
  for (const p of players) {
    if (!p || isGK(p)) continue;
    const pos = posOf(p);
    const dx = pos.x - ball.x;
    const dz = pos.z - ball.z;
    const along = (dx * ballVel.x + dz * ballVel.z) / speed;
    const perp = Math.abs(dx * (ballVel.z / speed) - dz * (ballVel.x / speed));
    if (along > bestAlong && along < 35 && perp < 5) {
      bestAlong = along;
      best = pos;
    }
  }
  return best;
};
