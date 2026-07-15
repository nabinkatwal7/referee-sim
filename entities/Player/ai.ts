import * as THREE from "three";
import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";

const WALK_SPEED = 2.5;
const RUN_SPEED = 6;
const RUN_DISTANCE = 8; // beyond this, sprint toward the target
const ARRIVE_RADIUS = 0.5; // close enough to stop
const WANDER_RADIUS = 15; // how far from home a new target may be picked
const MIN_PAUSE = 1; // seconds to stand still before/after each move
const MAX_PAUSE = 3;

// Idle -> Move -> Receive -> Pass -> Shoot -> Tackle -> Celebrate.
// Idle/Move are driven here (the wander loop); Receive/Pass/Shoot/Tackle/
// Celebrate are set externally by the match brain (see ./brain.ts) when the
// ball is involved — this module just freezes movement while one of those
// is active and hands control back once it expires.
export type PlayerFSMState = "idle" | "move" | "receive" | "pass" | "shoot" | "tackle" | "celebrate";

const REACTION_STATES = new Set<PlayerFSMState>([
  "receive",
  "pass",
  "shoot",
  "tackle",
  "celebrate",
]);

export type PlayerAIState = {
  home: [number, number, number];
  target: THREE.Vector3;
  elapsed: number;
  pauseUntil: number;
  fsmState: PlayerFSMState;
  stateTimer: number;
};

const randomPause = () => MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE);

const randomTarget = (home: [number, number, number]) => {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * WANDER_RADIUS;
  return new THREE.Vector3(
    home[0] + Math.cos(angle) * radius,
    home[1],
    home[2] + Math.sin(angle) * radius,
  );
};

export const createPlayerAIState = (home: [number, number, number]): PlayerAIState => ({
  home,
  target: randomTarget(home),
  elapsed: 0,
  pauseUntil: randomPause(),
  fsmState: "idle",
  stateTimer: 0,
});

// Puts a player into one of the ball-reaction states for `duration` seconds;
// stepPlayerAI freezes movement until it expires, then resumes wandering.
export const enterReactionState = (
  state: PlayerAIState,
  fsmState: Exclude<PlayerFSMState, "idle" | "move">,
  duration: number,
) => {
  state.fsmState = fsmState;
  state.stateTimer = duration;
};

// Static -> walk -> run, cycling: idles a moment, picks a random point near
// its home spot, walks or sprints there depending on distance, then repeats.
// Pure function — no React, no hooks — so it can run from the engine's
// updateAI phase instead of the component's own frame loop.
export const stepPlayerAI = (body: RapierRigidBody, state: PlayerAIState, delta: number) => {
  if (REACTION_STATES.has(state.fsmState)) {
    const linvel = body.linvel();
    body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    state.stateTimer -= delta;
    if (state.stateTimer <= 0) {
      state.fsmState = "move";
    }
    return;
  }

  state.elapsed += delta;
  const linvel = body.linvel();

  if (state.elapsed < state.pauseUntil) {
    state.fsmState = "idle";
    body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    return;
  }

  const pos = body.translation();
  const toTarget = new THREE.Vector3(state.target.x - pos.x, 0, state.target.z - pos.z);
  const distance = toTarget.length();

  if (distance < ARRIVE_RADIUS) {
    state.fsmState = "idle";
    body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    state.pauseUntil = state.elapsed + randomPause();
    state.target = randomTarget(state.home);
    return;
  }

  state.fsmState = "move";
  toTarget.normalize();
  const speed = distance > RUN_DISTANCE ? RUN_SPEED : WALK_SPEED;
  body.setLinvel({ x: toTarget.x * speed, y: linvel.y, z: toTarget.z * speed }, true);
};
