import type { RapierRigidBody } from "@react-three/rapier";
import type { TeamId } from "../../engine/team/Team";
import type { Pos2 } from "./nearestPlayer";
import { findNearestPlayer } from "./nearestPlayer";
import { placeBallForRestart, type BallOutResult } from "./ballOut";

// Steps 43–45 — Throw-in / Corner / Goal kick sequences.
// Nearest eligible player walks up, restarts, play resumes.

export type RestartKind = "throwIn" | "corner" | "goalKick";

export type RestartState = {
  kind: RestartKind;
  team: TeamId;
  position: { x: number; z: number };
  takerIndex: number | null;
  phase: "setup" | "approach" | "deliver" | "done";
  timer: number;
};

type PlayerSlot = {
  body: RapierRigidBody;
  teamId: TeamId;
  role: string;
} | null;

const APPROACH_SPEED = 4.5;
const ARRIVE = 1.2;
const DELIVER_DELAY = 0.55;

export const beginRestart = (
  out: Exclude<BallOutResult, { kind: "goal" }>,
  ball: RapierRigidBody,
): RestartState => {
  placeBallForRestart(ball, out.position, out.kind === "throwIn" ? 1.1 : 0.45);
  return {
    kind: out.kind,
    team: out.team,
    position: out.position,
    takerIndex: null,
    phase: "setup",
    timer: 0,
  };
};

const pickTaker = (
  players: PlayerSlot[],
  team: TeamId,
  kind: RestartKind,
  at: Pos2,
): number | null => {
  if (kind === "goalKick") {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p && p.teamId === team && p.role === "GK") return i;
    }
  }
  return findNearestPlayer(at, players.length, (i) => {
    const p = players[i];
    if (!p || p.teamId !== team) return null;
    if (kind !== "goalKick" && p.role === "GK") return null;
    const t = p.body.translation();
    return { x: t.x, z: t.z };
  })?.index ?? null;
};

const walkTo = (body: RapierRigidBody, target: Pos2, speed: number) => {
  const p = body.translation();
  const dx = target.x - p.x;
  const dz = target.z - p.z;
  const len = Math.hypot(dx, dz) || 1;
  const v = body.linvel();
  body.setLinvel({ x: (dx / len) * speed, y: v.y, z: (dz / len) * speed }, true);
};

/** Deliver the restart — returns true when the kick/throw has gone. */
const deliver = (
  ball: RapierRigidBody,
  state: RestartState,
  taker: NonNullable<PlayerSlot>,
) => {
  const intoPitch =
    state.kind === "throwIn"
      ? { x: -Math.sign(state.position.x || 1) * 8, z: (Math.random() - 0.5) * 6 }
      : state.kind === "corner"
        ? {
            x: -Math.sign(state.position.x || 1) * 10,
            z: -Math.sign(state.position.z || 1) * 14,
          }
        : // goal kick — upfield
          {
            x: (Math.random() - 0.5) * 8,
            z: -Math.sign(state.position.z || 1) * 16,
          };

  const y = state.kind === "throwIn" ? 4 : state.kind === "corner" ? 5 : 3;
  const len = Math.hypot(intoPitch.x, intoPitch.z) || 1;
  const speed = state.kind === "goalKick" ? 14 : state.kind === "corner" ? 12 : 9;
  ball.setLinvel(
    { x: (intoPitch.x / len) * speed, y, z: (intoPitch.z / len) * speed },
    true,
  );
  taker.body.setLinvel({ x: 0, y: taker.body.linvel().y, z: 0 }, true);
};

export type RestartStepResult =
  | { status: "active" }
  | { status: "complete"; takerIndex: number };

export const stepRestart = (
  state: RestartState,
  ball: RapierRigidBody,
  players: PlayerSlot[],
  delta: number,
): RestartStepResult => {
  state.timer += delta;

  if (state.phase === "setup") {
    state.takerIndex = pickTaker(players, state.team, state.kind, state.position);
    state.phase = "approach";
    state.timer = 0;
    return { status: "active" };
  }

  const takerIdx = state.takerIndex;
  if (takerIdx === null) {
    state.phase = "done";
    return { status: "complete", takerIndex: -1 };
  }
  const taker = players[takerIdx];
  if (!taker) {
    state.phase = "done";
    return { status: "complete", takerIndex: takerIdx };
  }

  if (state.phase === "approach") {
    const p = taker.body.translation();
    const dist = Math.hypot(p.x - state.position.x, p.z - state.position.z);
    if (dist > ARRIVE) {
      walkTo(taker.body, state.position, APPROACH_SPEED);
      // Keep ball planted.
      placeBallForRestart(ball, state.position, state.kind === "throwIn" ? 1.1 : 0.45);
      return { status: "active" };
    }
    taker.body.setLinvel({ x: 0, y: taker.body.linvel().y, z: 0 }, true);
    state.phase = "deliver";
    state.timer = 0;
    return { status: "active" };
  }

  if (state.phase === "deliver") {
    placeBallForRestart(ball, state.position, state.kind === "throwIn" ? 1.1 : 0.45);
    if (state.timer < DELIVER_DELAY) return { status: "active" };
    deliver(ball, state, taker);
    state.phase = "done";
    return { status: "complete", takerIndex: takerIdx };
  }

  return { status: "complete", takerIndex: takerIdx };
};
